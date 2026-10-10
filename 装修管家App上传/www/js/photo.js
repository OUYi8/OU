/* 照片：优先调原生相机 → 降级 <input type=file>；压缩后存 IndexedDB */
(function (w) {
  'use strict';

  var MAX_W = 1280;
  var QUALITY = 0.7;

  function pick(cb) {
    if (w.Camera && w.Camera.getPhoto) {
      w.Camera.getPhoto({
        quality: 85,
        sourceType: 1,                 // CAMERA
        correctOrientation: true,
        resultType: 1                  // base64
      }).then(function (r) {
        onData('data:image/jpeg;base64,' + r.dataURL, cb);
      }).catch(function (e) {
        /* 用户取消不算错误，降级到相册选择 */
        if (e && (e.message || '').indexOf('cancel') >= 0) return;
        pickFromFile(cb);
      });
      return;
    }
    pickFromFile(cb);
  }

  function pickFromFile(cb) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.capture = 'environment';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      document.body.removeChild(inp);
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { onData(fr.result, cb); };
      fr.readAsDataURL(f);
    };
    inp.click();
  }

  function onData(dataUrl, cb) {
    compress(dataUrl, function (small) { cb(small); }, function () { cb(dataUrl); });
  }

  function compress(src, ok, fail) {
    var img = new Image();
    img.onload = function () {
      try {
        var w0 = img.width, h0 = img.height;
        var sc = Math.min(1, MAX_W / w0);
        var cw = Math.round(w0 * sc), ch = Math.round(h0 * sc);
        var cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, cw, ch);
        var out = cv.toDataURL('image/jpeg', QUALITY);
        /* 压不动就别压了（已经很小） */
        ok(src.length < out.length ? src : out);
      } catch (e) { fail(); }
    };
    img.onerror = function () { fail(); };
    img.src = src;
  }

  /* 缩略图：用 CSS 尺寸控制，不重复存图 */
  var Photo = {
    pick: pick,
    save: function (ownerKey) {
      return new Promise(function (res) {
        pick(function (dataUrl) {
          var id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          w.PhotoStore.save(id, dataUrl).then(function () {
            res({ id: id, url: dataUrl });
          });
        });
      });
    },
    del: function (id) { return w.PhotoStore.del(id); },
    view: function (id) {
      w.PhotoStore.get(id).then(function (u) { if (u) UI.lightbox(u); });
    }
  };

  w.Photo = Photo;
})(window);
