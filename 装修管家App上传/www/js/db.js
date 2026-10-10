/* IndexedDB 极简封装：装修进度App 全部本地存储 */
(function (w) {
  'use strict';

  var DB_NAME = 'reno_app';
  var DB_VER = 1;
  var STORES = ['meta', 'phases', 'tasks', 'ledger', 'payments', 'buys', 'checks', 'photos'];

  var _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (res, rej) {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        STORES.forEach(function (s) {
          if (!db.objectStoreNames.contains(s)) {
            db.createObjectStore(s, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = function () { _db = req.result; res(_db); };
      req.onerror = function () { rej(req.error); };
    });
  }

  function tx(store, mode) {
    return open().then(function (db) {
      return db.transaction(store, mode || 'readonly').objectStore(store);
    });
  }

  function wrap(req) {
    return new Promise(function (res, rej) {
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }

  var DB = {
    put: function (store, obj) {
      return tx(store, 'readwrite').then(function (os) { return wrap(os.put(obj)); });
    },
    putMany: function (store, arr) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction(store, 'readwrite');
          var os = t.objectStore(store);
          arr.forEach(function (o) { os.put(o); });
          t.oncomplete = function () { res(arr.length); };
          t.onerror = function () { rej(t.error); };
        });
      });
    },
    del: function (store, id) {
      return tx(store, 'readwrite').then(function (os) { return wrap(os.delete(id)); });
    },
    all: function (store) {
      return tx(store).then(function (os) { return wrap(os.getAll()); });
    },
    get: function (store, id) {
      return tx(store).then(function (os) { return wrap(os.get(id)); });
    },
    clear: function (store) {
      return tx(store, 'readwrite').then(function (os) { return wrap(os.clear()); });
    },
    /* 全量导出（照片单独存 base64，体积大） */
    dump: function (withPhotos) {
      var tasks = STORES.map(function (s) {
        if (s === 'photos' && !withPhotos) return Promise.resolve([]);
        return DB.all(s).then(function (r) {
          return r.map(function (o) { o.__store = s; return o; });
        });
      });
      return Promise.all(tasks).then(function (rs) {
        return rs.reduce(function (a, b) { return a.concat(b); }, []);
      });
    },
    /* 全量导入 */
    restore: function (arr) {
      var groups = {};
      arr.forEach(function (o) {
        var s = o.__store || 'meta';
        delete o.__store;
        (groups[s] = groups[s] || []).push(o);
      });
      var keys = Object.keys(groups);
      return Promise.all(keys.map(function (s) {
        return DB.clear(s).then(function () { return DB.putMany(s, groups[s]); });
      })).then(function () { return keys.length; });
    }
  };

  /* 图片单独存：避免主表膨胀。用 id 索引，返回 blob URL */
  var Photo = {
    save: function (id, dataUrl) {
      return DB.put('photos', { id: id, dataUrl: dataUrl, ts: Date.now() });
    },
    get: function (id) { return DB.get('photos', id).then(function (r) { return r && r.dataUrl; }); },
    del: function (id) { return DB.del('photos', id); },
    all: function () { return DB.all('photos'); }
  };

  w.DB = DB;
  w.PhotoStore = Photo;
})(window);
