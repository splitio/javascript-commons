/* eslint-disable no-undef */
/**
 * Auto-require script to use with GaToSplit integration
 */
export function autoRequire() {
  (function (i: any, r: string, s: string) {
    i[s] = i[s] || r;
    i[r] = i[r] || function () { i[r].q.push(arguments); };
    i[r].q = i[r].q || [];

    var ts: any = {}; // Tracker names
    var o = i[r].q.push;
    i[r].q.push = function (v: any) {
      var result = o.apply(this, arguments);

      if (v && v[0] === 'create') {
        var t = typeof v[2] === 'object' && typeof v[2].name === 'string' ?
          v[2].name : // `ga('create', 'UA-ID', { name: 'trackerName', ... })`
          typeof v[3] === 'object' && typeof v[3].name === 'string' ?
            v[3].name : // `ga('create', 'UA-ID', 'auto', { name: 'trackerName', ... })`
            typeof v[3] === 'string' ?
              v[3] : // `ga('create', 'UA-ID', 'auto', 'trackerName')`
              undefined; // No name tracker, e.g.: `ga('create', 'UA-ID', 'auto')`

        if (!ts[t]) {
          ts[t] = true;
          i[r](t ? t + '.require' : 'require', 'splitTracker'); // Auto-require
        }
      }

      return result;
    };

  })(window, 'ga', 'GoogleAnalyticsObject');
}
