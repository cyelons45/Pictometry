define(
  [
    'dojo/_base/declare',
    'dojo/_base/array',
    'widgets/Pictometry/isFunction',
    'widgets/Pictometry/cycle.js'
  ],

  function (declare, array, isFunction) {

    // DebugDisplay is responsible for collecting debug information from various parts of the system and displaying it
    // to the user.  It implements the mediator pattern and uses a collection of objects that must implement a function
    // called "getDebugInfo".
    var DebugDisplay = declare(null, {
      constructor: function () {
        this.participants = [];
      },

      // Adds an object to the list of things to grab debug information from.  It must implement a function called "getDebugInfo".
      addParticipant: function (participant, name) {
        if (isFunction(participant.getDebugInfo)) {
          this.participants.push({name: name, obj: participant});
        } else {
          throw '"' + name + '" does not implement getDebugInfo().';
        }
      },

      display: function () {
        // Accumulate the data to display.
        var output = [];
        array.forEach(this.participants, function (participant, i) {
          var participantOutput = {};
          var name = participant.name;
          participantOutput[name] = participant.obj.getDebugInfo();
          output.push(participantOutput);
        });

        // Show it in a new tab.
        var serialized = JSON.stringify(JSON.decycle(output));
        window.open('data:text/html,' + encodeURIComponent(serialized), '_blank');
      }
    });

    return new DebugDisplay();
  }
);
