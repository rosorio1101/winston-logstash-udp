//
// ### function clone (obj)
// #### @obj {Object} Object to clone.
// Helper method for deep cloning pure JSON objects
// i.e. JSON objects that are either literals or objects (no Arrays, etc)
//
exports.clone = function (obj) {
  if (obj instanceof Error) {
    // With potential custom Error objects, this might not be exactly correct,
    // but probably close-enough for purposes of this lib.
    var copy = { message: obj.message };
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      copy[key] = obj[key];
    });

    return cycle.decycle(copy);
  }
  else if (!(obj instanceof Object)) {
    return obj;
  }
  else if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  return clone(cycle.decycle(obj));
};

function clone(obj) {
  //
  // We only need to clone reference types (Object)
  //
  var copy = Array.isArray(obj) ? [] : {};

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (Array.isArray(obj[i])) {
        copy[i] = obj[i].slice(0);
      }
      else if (obj[i] instanceof Buffer) {
        copy[i] = obj[i].slice(0);
      }
      else if (typeof obj[i] != 'function') {
        copy[i] = obj[i] instanceof Object ? exports.clone(obj[i]) : obj[i];
      }
      else if (typeof obj[i] === 'function') {
        copy[i] = obj[i];
      }
    }
  }

  return copy;
}