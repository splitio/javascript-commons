/* eslint-disable no-undef */
/**
 * Auto-require script to use with GoogleAnalyticsToSplit integration
 */
(function (w, g, o) {
  w[o] = w[o] || g;
  w[g] = w[g] || function () { w[g].q.push(arguments); };
  w[g].q = w[g].q || [];

  var trackerNames = {};
  function name(arg) { return typeof arg === 'object' && typeof arg.name === 'string' && arg.name; }

  function processCommand(command) { // Queue a `require` command if v is a `create` command
    if (command && command[0] === 'create') {
      var trackerName = name(command[1]) || name(command[2]) || name(command[3]) || (typeof command[3] === 'string' ? command[3] : undefined); // Get tracker name

      if (!trackerNames[trackerName]) {
        trackerNames[trackerName] = true;
        w[g]((trackerName ? trackerName + '.' : '') + 'require', 'splitTracker'); // Auto-require
      }
    }
  }

  w[g].q.forEach(processCommand); // Process already queued commands

  var originalPush = w[g].q.push;
  w[g].q.push = function (command) { // Spy new queued commands
    var result = originalPush.apply(this, arguments);
    processCommand(command);
    return result;
  };

})(window, 'ga', 'GoogleAnalyticsObject');
