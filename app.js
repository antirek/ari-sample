/*jshint node: true*/
'use strict';

var ari = require('ari-client');
var util = require('util');

var timers = {};
ari.connect('http://localhost:8088', 'asterisk', 'asterisk', clientLoaded);

// handler for client being loaded
function clientLoaded (err, client) {
  if (err) {
    throw err;
  }

  // handler for StasisStart event
  function stasisStart(event, channel) {
    console.log(util.format(
          'Channel %s has entered the application', channel.name));

    channel.ring(function(err) {
      if (err) {
        throw err;
      }
    });
    // answer the channel after 2 seconds
    var timer = setTimeout(answer, 2000);
    timers[channel.id] = timer;

    // callback that will answer the channel
    function answer() {
      console.log(util.format('Answering channel %s', channel.name));
      
      channel.answer(function(err) {
        if (err) {
          throw err;
        }
        console.log('in answer');

        var playback = client.Playback();
        channel.play({media: 'sound:beep'},
                      playback, function(err, newPlayback) {
          if (err) {
            throw err;
          }
        });
        playback.on('PlaybackFinished', playbackFinished);

        function playbackFinished (event, completedPlayback) {
          console.log(util.format(
              'Monkeys successfully vanquished %s',
              channel.name));          
        
          // hang up the channel in 4 seconds
          var timer = setTimeout(hangup, 4000);
          timers[channel.id] = timer;

          /*
          channel.originate({endpoint: 'SIP/102', app: 'channel-state'})
          .then(function (channel1) {
            console.log('originate cool', channel1);
            var bridge = ari.Bridge();
            console.log('bridge', bridge);
            bridge.create({type: 'mixing'})
            .then(function (bridge){
              console.log('bridge', bridge);
              bridge.addChannel({channel: [channel1.id, channel.id]});
              bridge.addChannel({channel:channel.id});
            })
            
          })
          .catch(function (err) {});
          */
        };
        
      });

    }

    // callback that will hangup the channel
    function hangup() {
      console.log(util.format('Hanging up channel %s', channel.name));
      channel.hangup(function(err) {
        if (err) {
          throw err;
        }
      });
    }
  }

  // handler for StasisEnd event
  function stasisEnd(event, channel) {
    console.log(util.format(
          'Channel %s just left our application', channel.name));
    var timer = timers[channel.id];
    if (timer) {
      clearTimeout(timer);
      delete timers[channel.id];
    }
  }

  // handler for ChannelStateChange event
  function channelStateChange(event, channel) {
    console.log(util.format(
          'Channel %s is now: %s', channel.name, channel.state));
  }

  client.on('StasisStart', stasisStart);
  client.on('StasisEnd', stasisEnd);
  client.on('ChannelStateChange', channelStateChange);

  client.start('channel-state');
}