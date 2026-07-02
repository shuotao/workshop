/* ============================================================
   協作白板邏輯 — Fabric.js 畫布 + Firebase RTDB 即時同步
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 房間 ---------- */
  var ROOMS = {
    slide5:  '心法討論',
    slide8:  'GEM 成果',
    slide10: '流程截圖'
  };
  var qs = new URLSearchParams(location.search);
  var roomId = qs.get('room');
  if (!ROOMS.hasOwnProperty(roomId)) roomId = 'slide5';
  document.getElementById('roomLabel').textContent = roomId + ' · ' + ROOMS[roomId];

  /* ---------- 暖色盤(Henry)---------- */
  var PALETTE = ['#c2563a', '#caa04d', '#6f7d5e', '#5a6b80', '#7d5a6b', '#2a2722'];
  var NOTE_FILL = '#fff7d6';

  /* ---------- 狀態 ---------- */
  var uid = null, nick = '', myColor = PALETTE[0], started = false;
  var tool = 'select';
  var drawColor = '#2a2722';
  var applyingRemote = false;
  var idToObj = new Map();
  var objectsRef = null, presenceRef = null, myPresRef = null, metaRef = null;
  var canvas = null;

  /* ---------- 小工具 ---------- */
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
  }
  function round(n) { return Math.round(n * 100) / 100; }
  function hashIdx(s, mod) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % mod; }
  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'o-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function ts() { return firebase.database.ServerValue.TIMESTAMP; }

  /* ============================================================
     登入 modal
     ============================================================ */
  function buildLogin() {
    var pick = document.getElementById('colorPick');
    PALETTE.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'swatch' + (i === 0 ? ' active' : '');
      b.style.background = c;
      b.onclick = function () {
        myColor = c;
        [].forEach.call(pick.children, function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      };
      pick.appendChild(b);
    });
    var savedNick = localStorage.getItem('gsn_nick');
    var savedColor = localStorage.getItem('gsn_color');
    if (savedNick) document.getElementById('nickInput').value = savedNick;
    if (savedColor && PALETTE.indexOf(savedColor) >= 0) {
      myColor = savedColor;
      [].forEach.call(pick.children, function (x, i) {
        x.classList.toggle('active', PALETTE[i] === savedColor);
      });
    }
    document.getElementById('loginTitle').textContent = '進入白板 — ' + ROOMS[roomId];
    document.getElementById('enterBtn').onclick = doEnter;
    document.getElementById('nickInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doEnter();
    });
    document.getElementById('nickInput').focus();
  }

  function doEnter() {
    var n = document.getElementById('nickInput').value.trim();
    if (!n) { document.getElementById('loginStatus').textContent = '請先輸入暱稱'; return; }
    nick = n; drawColor = myColor;
    localStorage.setItem('gsn_nick', nick);
    localStorage.setItem('gsn_color', myColor);
    document.getElementById('loginStatus').textContent = '連線中…';

    if (!window.FB_READY) {
      document.getElementById('loginStatus').textContent =
        '⚠ Firebase 尚未設定(firebase-config.js)。請填入設定後重試。';
      return;
    }
    if (uid) { maybeStart(); return; } // 已通過匿名登入
    window.fbAuth.signInAnonymously().catch(function (err) {
      document.getElementById('loginStatus').textContent = '登入失敗:' + err.message;
    });
  }

  /* ============================================================
     Firebase 連線
     ============================================================ */
  function startSession() {
    var base = window.fbDb.ref('rooms/' + roomId);
    objectsRef = base.child('objects');
    presenceRef = base.child('presence');
    myPresRef = presenceRef.child(uid);
    metaRef = base.child('meta');

    metaRef.child('createdAt').once('value', function (s) {
      if (!s.exists()) metaRef.set({ createdAt: ts(), title: ROOMS[roomId] });
    });

    // presence
    myPresRef.set({ nick: nick, color: myColor, online: true, lastSeen: ts() });
    myPresRef.onDisconnect().remove();
    setInterval(function () { myPresRef.child('lastSeen').set(ts()); }, 25000);
    presenceRef.on('value', renderPresence);

    // 物件同步
    objectsRef.on('child_added', onRemoteAdd);
    objectsRef.on('child_changed', onRemoteChange);
    objectsRef.on('child_removed', onRemoteRemove);

    document.getElementById('overlay').classList.add('hide');
    initCanvas();
    wireToolbar();
    wireImageCapture();
    toast('已進入「' + ROOMS[roomId] + '」白板 — 開始協作吧!', 3200);
  }

  /* ============================================================
     線上名單 + 遠端游標
     ============================================================ */
  function renderPresence(snap) {
    var box = document.getElementById('presence');
    var cursors = document.getElementById('cursors');
    var now = Date.now();
    box.innerHTML = '';
    var people = snap.val() || {};
    var ids = Object.keys(people);
    var live = [];
    ids.forEach(function (id) {
      var p = people[id];
      if (!p || p.online === false) return;
      if (p.lastSeen && (now - p.lastSeen) > 90000) return; // 90s 視為離線
      live.push(id);
      var chip = document.createElement('div');
      chip.className = 'pchip';
      chip.style.background = p.color || '#888';
      chip.title = p.nick || '';
      chip.textContent = (p.nick || '?').slice(0, 1);
      box.appendChild(chip);
    });
    document.getElementById('pcount').textContent = live.length + ' 人在線';

    // 遠端游標
    var seen = {};
    live.forEach(function (id) {
      if (id === uid) return;
      var p = people[id];
      if (!p || !p.cursor) return;
      seen[id] = true;
      var el = cursors.querySelector('[data-u="' + id + '"]');
      if (!el) {
        el = document.createElement('div');
        el.className = 'cursor'; el.setAttribute('data-u', id);
        el.innerHTML = '<div class="dot"></div><div class="name"></div>';
        cursors.appendChild(el);
      }
      el.querySelector('.dot').style.background = p.color || '#888';
      var nm = el.querySelector('.name');
      nm.textContent = p.nick || ''; nm.style.background = p.color || '#888';
      el.style.transform = 'translate(' + p.cursor.x + 'px,' + p.cursor.y + 'px)';
    });
    [].forEach.call(cursors.children, function (el) {
      if (!seen[el.getAttribute('data-u')]) el.remove();
    });
  }

  /* ============================================================
     Fabric 畫布
     ============================================================ */
  function initCanvas() {
    var stage = document.getElementById('stage');
    canvas = new fabric.Canvas('board', {
      backgroundColor: '#f7f5f0',
      selection: true,
      preserveObjectStacking: true
    });
    function resize() {
      canvas.setDimensions({ width: stage.clientWidth, height: stage.clientHeight });
    }
    resize();
    window.addEventListener('resize', resize);

    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 3;
    canvas.freeDrawingBrush.color = drawColor;

    // 點空白處放置便利貼 / 方框
    canvas.on('mouse:down', function (opt) {
      if (tool !== 'note' && tool !== 'rect') return;
      if (opt.target) return; // 點到既有物件不放置
      var p = canvas.getPointer(opt.e);
      if (tool === 'note') createNote(p.x, p.y);
      else createRect(p.x, p.y);
      setTool('select');
    });

    // 本地修改 → 廣播
    canvas.on('object:modified', function (e) {
      if (applyingRemote || !e.target || !e.target.id) return;
      pushUpdate(e.target);
    });
    canvas.on('text:editing:exited', function (e) {
      if (applyingRemote || !e.target || !e.target.id) return;
      pushUpdate(e.target);
    });
    // 自由畫筆完成 → 建立 path 物件
    canvas.on('path:created', function (e) {
      var path = e.path;
      path.id = newId(); path._kind = 'path'; path._color = drawColor; path.owner = uid;
      path.set({ stroke: drawColor, fill: '' });
      idToObj.set(path.id, path);
      pushCreate(path);
    });

    // 游標廣播(節流)
    var lastCur = 0;
    canvas.on('mouse:move', function (opt) {
      var now = Date.now();
      if (now - lastCur < 60) return;
      lastCur = now;
      var p = canvas.getPointer(opt.e);
      myPresRef.child('cursor').set({ x: round(p.x), y: round(p.y) });
    });

    // 鍵盤刪除
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      var a = canvas.getActiveObject();
      if (!a || a.isEditing) return;
      e.preventDefault();
      deleteActive();
    });
  }

  /* ---------- 建立物件 ---------- */
  function createNote(x, y) {
    var o = new fabric.Textbox('輸入文字…', {
      left: x, top: y, width: 180, fontSize: 18, fontFamily: 'Inter, "Noto Sans TC", sans-serif',
      fill: '#2a2722', backgroundColor: NOTE_FILL, padding: 10, splitByGrapheme: true,
      editable: true, cornerColor: '#2a2722', transparentCorners: false
    });
    o.id = newId(); o._kind = 'note'; o._color = myColor; o.owner = uid;
    idToObj.set(o.id, o);
    applyingRemote = true; canvas.add(o); applyingRemote = false;
    canvas.setActiveObject(o); o.enterEditing(); o.selectAll();
    pushCreate(o);
  }
  function createRect(x, y) {
    var o = new fabric.Rect({
      left: x, top: y, width: 140, height: 90, fill: 'rgba(0,0,0,0)',
      stroke: drawColor, strokeWidth: 2, cornerColor: '#2a2722', transparentCorners: false
    });
    o.id = newId(); o._kind = 'shape'; o._color = drawColor; o.owner = uid;
    idToObj.set(o.id, o);
    applyingRemote = true; canvas.add(o); applyingRemote = false;
    canvas.setActiveObject(o);
    pushCreate(o);
  }

  /* ---------- 序列化 ---------- */
  function serialize(o) {
    var r = {
      type: o._kind, owner: o.owner || uid, nick: nick, color: o._color || myColor,
      left: round(o.left), top: round(o.top),
      scaleX: round(o.scaleX || 1), scaleY: round(o.scaleY || 1), angle: round(o.angle || 0),
      updatedAt: ts(), data: {}
    };
    if (o._kind === 'note') {
      r.data = { text: o.text || '', w: round(o.width || 180), fill: o.backgroundColor || NOTE_FILL, fontSize: o.fontSize || 18 };
    } else if (o._kind === 'shape') {
      r.data = { shape: 'rect', w: round(o.width || 0), h: round(o.height || 0), stroke: o.stroke || '#2a2722', strokeWidth: o.strokeWidth || 2 };
    } else if (o._kind === 'path') {
      r.data = { d: JSON.stringify(o.path || []), stroke: o.stroke || '#2a2722', strokeWidth: o.strokeWidth || 3 };
    } else if (o._kind === 'image') {
      r.data = { src: o._src || '', w: round(o.width || 0), h: round(o.height || 0) };
    }
    return r;
  }
  function pushCreate(o) { objectsRef.child(o.id).set(serialize(o)); }
  function pushUpdate(o) {
    var r = serialize(o);
    objectsRef.child(o.id).update(r);
  }

  /* ---------- 反序列化 ---------- */
  function buildFromRecord(id, r, cb) {
    var common = {
      left: r.left || 0, top: r.top || 0,
      scaleX: r.scaleX || 1, scaleY: r.scaleY || 1, angle: r.angle || 0,
      cornerColor: '#2a2722', transparentCorners: false
    };
    var o;
    if (r.type === 'note') {
      o = new fabric.Textbox((r.data && r.data.text) || '', Object.assign({}, common, {
        width: (r.data && r.data.w) || 180, fontSize: (r.data && r.data.fontSize) || 18,
        fontFamily: 'Inter, "Noto Sans TC", sans-serif', fill: '#2a2722',
        backgroundColor: (r.data && r.data.fill) || NOTE_FILL, padding: 10, splitByGrapheme: true, editable: true
      }));
    } else if (r.type === 'shape') {
      o = new fabric.Rect(Object.assign({}, common, {
        width: (r.data && r.data.w) || 120, height: (r.data && r.data.h) || 80,
        fill: 'rgba(0,0,0,0)', stroke: (r.data && r.data.stroke) || '#2a2722', strokeWidth: (r.data && r.data.strokeWidth) || 2
      }));
    } else if (r.type === 'path') {
      var pth = [];
      try { pth = JSON.parse((r.data && r.data.d) || '[]'); } catch (e) { pth = (r.data && r.data.d) || ''; }
      o = new fabric.Path(pth, Object.assign({}, common, {
        fill: '', stroke: (r.data && r.data.stroke) || '#2a2722', strokeWidth: (r.data && r.data.strokeWidth) || 3
      }));
    } else if (r.type === 'image') {
      var src = (r.data && r.data.src) || '';
      fabric.FabricImage.fromURL(src).then(function (img) {
        img.set(common); img._src = src;
        finish(img);
      }).catch(function () { cb(null); });
      return;
    }
    finish(o);
    function finish(obj) {
      if (!obj) { cb(null); return; }
      obj.id = id; obj._kind = r.type; obj._color = r.color; obj.owner = r.owner;
      cb(obj);
    }
  }

  /* ---------- 遠端事件 ---------- */
  function onRemoteAdd(snap) {
    var id = snap.key;
    if (idToObj.has(id)) return;
    idToObj.set(id, true); // 佔位,避免 await 期間重複
    buildFromRecord(id, snap.val(), function (o) {
      if (!o) { if (idToObj.get(id) === true) idToObj.delete(id); return; }
      idToObj.set(id, o);
      applyingRemote = true; canvas.add(o); applyingRemote = false;
      canvas.requestRenderAll();
    });
  }
  function onRemoteChange(snap) {
    var id = snap.key, r = snap.val();
    var o = idToObj.get(id);
    if (!o || o === true) return;
    applyingRemote = true;
    o.set({ left: r.left || 0, top: r.top || 0, scaleX: r.scaleX || 1, scaleY: r.scaleY || 1, angle: r.angle || 0 });
    if (r.type === 'note' && o.type === 'textbox') {
      o.set({ text: (r.data && r.data.text) || '', backgroundColor: (r.data && r.data.fill) || NOTE_FILL });
    }
    o.setCoords();
    applyingRemote = false;
    canvas.requestRenderAll();
  }
  function onRemoteRemove(snap) {
    var id = snap.key, o = idToObj.get(id);
    idToObj.delete(id);
    if (o && o !== true) { applyingRemote = true; canvas.remove(o); applyingRemote = false; canvas.requestRenderAll(); }
  }

  function deleteActive() {
    var objs = canvas.getActiveObjects();
    if (!objs.length) return;
    canvas.discardActiveObject();
    objs.forEach(function (o) {
      if (o.id) objectsRef.child(o.id).remove();
      idToObj.delete(o.id);
      canvas.remove(o);
    });
    canvas.requestRenderAll();
  }

  /* ============================================================
     工具列
     ============================================================ */
  function setTool(t) {
    tool = t;
    canvas.isDrawingMode = (t === 'draw');
    if (t === 'draw') { canvas.freeDrawingBrush.color = drawColor; canvas.freeDrawingBrush.width = 3; }
    canvas.selection = (t === 'select');
    canvas.defaultCursor = (t === 'note' || t === 'rect') ? 'crosshair' : 'default';
    ['Select', 'Note', 'Draw', 'Rect'].forEach(function (k) {
      var el = document.getElementById('tool' + k);
      if (el) el.classList.toggle('active', k.toLowerCase() === t);
    });
  }

  function wireToolbar() {
    document.getElementById('toolSelect').onclick = function () { setTool('select'); };
    document.getElementById('toolNote').onclick = function () { setTool('note'); toast('點白板任一處放下便利貼'); };
    document.getElementById('toolDraw').onclick = function () { setTool('draw'); };
    document.getElementById('toolRect').onclick = function () { setTool('rect'); toast('點白板任一處放下方框'); };
    document.getElementById('toolDelete').onclick = deleteActive;

    var sw = document.getElementById('swatches');
    PALETTE.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'swatch' + (c === drawColor ? ' active' : '');
      b.style.background = c;
      b.title = '畫筆 / 框線顏色';
      b.onclick = function () {
        drawColor = c;
        if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.color = c;
        [].forEach.call(sw.children, function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var a = canvas.getActiveObject();
        if (a && (a._kind === 'shape' || a._kind === 'path')) {
          a.set('stroke', c); a._color = c; canvas.requestRenderAll(); pushUpdate(a);
        }
      };
      sw.appendChild(b);
    });
  }

  /* ============================================================
     圖片 / 截圖管線
     ============================================================ */
  function compress(dataURL, maxEdge, q) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        var s = Math.min(1, maxEdge / Math.max(w, h));
        w = Math.round(w * s); h = Math.round(h * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej; img.src = dataURL;
    });
  }
  function blobToDataURL(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = rej; fr.readAsDataURL(blob);
    });
  }

  function placeImage(dataURL) {
    compress(dataURL, 1280, 0.7).then(function (small) {
      if (small.length > 1050000) { toast('圖片太大,請裁切後再貼(上限約 800KB)'); return; }
      return fabric.FabricImage.fromURL(small).then(function (img) {
        var maxW = Math.min(440, canvas.getWidth() * 0.6);
        var sc = img.width > maxW ? maxW / img.width : 1;
        var off = (idToObj.size % 6) * 18;
        img.set({
          left: canvas.getWidth() / 2 - (img.width * sc) / 2 + off,
          top: canvas.getHeight() / 2 - (img.height * sc) / 2 + off,
          scaleX: sc, scaleY: sc, cornerColor: '#2a2722', transparentCorners: false
        });
        img.id = newId(); img._kind = 'image'; img._color = myColor; img.owner = uid; img._src = small;
        idToObj.set(img.id, img);
        applyingRemote = true; canvas.add(img); applyingRemote = false;
        canvas.setActiveObject(img); canvas.requestRenderAll();
        pushCreate(img);
        toast('圖片已貼上,大家都看得到了 ✓');
      });
    }).catch(function () { toast('圖片處理失敗'); });
  }

  function handleFiles(files) {
    [].forEach.call(files, function (f) {
      if (f.type.indexOf('image/') !== 0) return;
      blobToDataURL(f).then(placeImage);
    });
  }

  function wireImageCapture() {
    // 1) 剪貼簿貼上
    document.addEventListener('paste', function (e) {
      var items = (e.clipboardData && e.clipboardData.items) || [];
      var got = false;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          got = true;
          var f = items[i].getAsFile();
          if (f) blobToDataURL(f).then(placeImage);
        }
      }
      if (got) e.preventDefault();
    });

    // 2) 拖放
    var stage = document.getElementById('stage');
    ['dragenter', 'dragover'].forEach(function (ev) {
      stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      stage.addEventListener(ev, function (e) {
        e.preventDefault();
        if (ev === 'dragleave' && e.target !== stage) return;
        stage.classList.remove('dragover');
      });
    });
    stage.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    });

    // 2b) 上傳
    var fi = document.getElementById('fileInput');
    document.getElementById('toolUpload').onclick = function () { fi.click(); };
    fi.onchange = function () { handleFiles(fi.files); fi.value = ''; };

    // 3) 擷取畫面
    var capBtn = document.getElementById('toolCapture');
    if (!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)) {
      capBtn.style.display = 'none';
    } else {
      capBtn.onclick = captureScreen;
    }
  }

  function captureScreen() {
    toast('只擷取一張,擷取後立即停止分享');
    navigator.mediaDevices.getDisplayMedia({ video: true }).then(function (stream) {
      var video = document.createElement('video');
      video.srcObject = stream;
      video.onloadedmetadata = function () {
        video.play();
        setTimeout(function () {
          var c = document.createElement('canvas');
          c.width = video.videoWidth; c.height = video.videoHeight;
          c.getContext('2d').drawImage(video, 0, 0);
          stream.getTracks().forEach(function (t) { t.stop(); });
          placeImage(c.toDataURL('image/jpeg', 0.92));
        }, 250);
      };
    }).catch(function (err) {
      if (err && err.name === 'NotAllowedError') return; // 使用者取消
      toast('擷取畫面失敗:' + (err && err.message ? err.message : ''));
    });
  }

  /* ============================================================
     啟動
     ============================================================ */
  function maybeStart() {
    if (started || !uid || !nick) return;
    started = true;
    startSession();
  }

  buildLogin();
  if (window.FB_READY) {
    window.fbAuth.onAuthStateChanged(function (user) {
      if (user) {
        uid = user.uid;
        localStorage.setItem('gsn_uid', uid);
        maybeStart(); // nick 設好且尚未啟動才進場
      }
    });
  }
})();
