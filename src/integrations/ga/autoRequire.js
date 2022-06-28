/* eslint-disable no-undef */
/**
 * Auto-require script to use with GoogleAnalyticsToSplit integration
 */
(function (i, r, s) {
  i[s] = i[s] || r;
  i[r] = i[r] || function () { i[r].q.push(arguments); };
  i[r].q = i[r].q || [];

  var ts = {}; // Tracker names
  function n(arg) { return typeof arg === 'object' && typeof arg.name === 'string' && arg.name; }

  function p(v) { // Queue a `require` command if v is a `create` command
    if (v && v[0] === 'create') {
      var t = n(v[1]) || n(v[2]) || n(v[3]) || (typeof v[3] === 'string' ? v[3] : undefined); // Get tracker name

      if (!ts[t]) {
        ts[t] = true;
        i[r]((t ? t + '.' : '') + 'require', 'splitTracker'); // Auto-require
      }
    }
  }

  i[r].q.forEach(function (v) { p(v); }); // Process already queued commands

  var o = i[r].q.push;
  i[r].q.push = function (v) { // Spy new queued commands
    var result = o.apply(this, arguments);
    p(v);
    return result;
  };

})(window, 'ga', 'GoogleAnalyticsObject');
