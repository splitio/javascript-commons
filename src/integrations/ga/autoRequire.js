/* eslint-disable no-undef */
/**
 * Auto-require script to use with GaToSplit integration
 */
(function (i, r, s) {
  i[s] = i[s] || r;
  i[r] = i[r] || function () { i[r].q.push(arguments); };
  i[r].q = i[r].q || [];

  var ts = {}; // Tracker names
  var o = i[r].q.push;
  i[r].q.push = function (v) {
    var result = o.apply(this, arguments);

    if (v && v[0] === 'create') {
      var t = typeof v[2] === 'object' && typeof v[2].name === 'string' ?
        v[2].name : // `ga('create', 'UA-ID', { name: 'trackerName', ... })`
        typeof v[3] === 'object' && typeof v[3].name === 'string' ?
          v[3].name : // `ga('create', 'UA-ID', 'auto', { name: 'trackerName', ... })`
          typeof v[3] === 'string' ?
            v[3] : // `ga('create', 'UA-ID', 'auto', 'trackerName')`
            undefined; // Default name, e.g.: `ga('create', 'UA-ID', 'auto')`

      if (!ts[t]) {
        ts[t] = true;
        i[r]((t ? t + '.' : '') + 'require', 'splitTracker'); // Auto-require
      }
    }

    return result;
  };

})(window, 'ga', 'GoogleAnalyticsObject');
