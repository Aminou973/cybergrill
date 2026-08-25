/* ==========================================================================
   CyberGrill — the voice room
   --------------------------------------------------------------------------
   Everybody at the table talks to everybody else directly: a small mesh of
   WebRTC connections, one per pair. The game's own WebSocket carries the
   introductions -- who wants to talk, and the offer/answer/ICE traffic that
   sets a connection up -- and after that the audio never touches the server.

   Two things worth knowing.

   Glare: if both sides make an offer at the same moment, neither connects.
   So only one side ever offers, chosen by comparing the two player ids. It
   is arbitrary but both sides agree on it without another round trip.

   NAT: there is a STUN server so two people behind ordinary home routers can
   find each other, but no TURN relay. On a network that refuses direct
   connections -- some mobile carriers, some office firewalls -- the voice
   will not come through even though the game does. That is the honest limit
   of doing this without a paid relay.
   ========================================================================== */
(function (root) {
  'use strict';

  var RTC = {
    iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
  };

  var send = null;          /* how to reach the room: set by the table page */
  var onChange = null;      /* told whenever anything visible changes */
  var self = null;
  var local = null;         /* my microphone */
  var peers = {};           /* id -> { pc, audio, level, speaking, state } */
  var on = false, muted = false, level = 0, speaking = false, err = '';
  var ac = null;            /* one AudioContext for all the level meters */

  function fire() { if (onChange) onChange(state()); }

  function state() {
    var talking = [];
    Object.keys(peers).forEach(function (id) { if (peers[id].speaking) talking.push(id); });
    if (speaking && !muted) talking.push(self);
    return {
      on: on, muted: muted, error: err,
      level: level, speaking: speaking && !muted,
      talking: talking,
      peers: Object.keys(peers).map(function (id) {
        return { id: id, speaking: peers[id].speaking, state: peers[id].state };
      })
    };
  }

  /* ---- how loud is this stream, right now ---------------------------- */
  function meter(stream, set) {
    try {
      ac = ac || new (root.AudioContext || root.webkitAudioContext)();
      var src = ac.createMediaStreamSource(stream);
      var an = ac.createAnalyser();
      an.fftSize = 512; an.smoothingTimeConstant = .75;
      src.connect(an);
      var buf = new Uint8Array(an.frequencyBinCount);
      var live = true;
      (function loop() {
        if (!live) return;
        an.getByteFrequencyData(buf);
        var sum = 0;
        for (var i = 2; i < 40; i++) sum += buf[i];       /* the speech band */
        set(Math.min(1, (sum / 38) / 90));
        requestAnimationFrame(loop);
      })();
      return function () { live = false; try { src.disconnect(); } catch (e) { } };
    } catch (e) { return function () { }; }
  }

  /* ---- one connection to one other person ---------------------------- */
  function connect(id) {
    if (peers[id] || id === self || !local) return peers[id];
    var pc = new RTCPeerConnection(RTC);
    var slot = peers[id] = { pc: pc, speaking: false, state: 'connecting', stop: null };

    local.getTracks().forEach(function (t) { pc.addTrack(t, local); });

    pc.onicecandidate = function (e) {
      if (e.candidate) send({ t: 'rtc', to: id, data: { ice: e.candidate } });
    };
    pc.ontrack = function (e) {
      var stream = e.streams[0];
      var a = slot.audio || (slot.audio = new Audio());
      a.autoplay = true; a.srcObject = stream;
      a.play().catch(function () { });
      if (slot.stop) slot.stop();
      slot.stop = meter(stream, function (v) {
        var was = slot.speaking;
        slot.speaking = v > .12;
        if (was !== slot.speaking) fire();
      });
    };
    pc.onconnectionstatechange = function () {
      slot.state = pc.connectionState;
      if (pc.connectionState === 'failed') {
        /* one retry, then give up quietly rather than thrash */
        drop(id); if (on) setTimeout(function () { if (on) connect(id); }, 1500);
      }
      fire();
    };

    /* only one side offers, and both sides work out which without asking */
    if (self < id) {
      pc.onnegotiationneeded = function () {
        pc.createOffer()
          .then(function (o) { return pc.setLocalDescription(o); })
          .then(function () { send({ t: 'rtc', to: id, data: { sdp: pc.localDescription } }); })
          .catch(function () { });
      };
    }
    fire();
    return slot;
  }

  function drop(id) {
    var s = peers[id];
    if (!s) return;
    if (s.stop) s.stop();
    if (s.audio) { s.audio.srcObject = null; s.audio.remove && s.audio.remove(); }
    try { s.pc.close(); } catch (e) { }
    delete peers[id];
    fire();
  }

  /* ---- the introductions, relayed by the room ------------------------ */
  function signal(m) {
    if (!on || !m || m.from === self) return;
    var id = m.from, d = m.data || {};
    var slot = peers[id] || connect(id);
    if (!slot) return;
    var pc = slot.pc;
    if (d.sdp) {
      pc.setRemoteDescription(d.sdp).then(function () {
        if (d.sdp.type !== 'offer') return;
        return pc.createAnswer()
          .then(function (a) { return pc.setLocalDescription(a); })
          .then(function () { send({ t: 'rtc', to: id, data: { sdp: pc.localDescription } }); });
      }).catch(function () { });
    } else if (d.ice) {
      pc.addIceCandidate(d.ice).catch(function () { });
    }
  }

  /* who else is in the voice room right now */
  function roster(ids) {
    if (!on) return;
    ids = (ids || []).filter(function (x) { return x && x !== self; });
    ids.forEach(function (id) { if (!peers[id]) connect(id); });
    Object.keys(peers).forEach(function (id) { if (ids.indexOf(id) === -1) drop(id); });
  }

  function join() {
    if (on) return Promise.resolve(true);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      err = 'This browser will not give a page the microphone.'; fire();
      return Promise.resolve(false);
    }
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false
    }).then(function (stream) {
      local = stream; on = true; muted = false; err = '';
      meter(stream, function (v) {
        level = v;
        var was = speaking;
        speaking = v > .12;
        if (was !== speaking) fire();
      });
      send({ t: 'voice', on: true, muted: false });
      fire();
      return true;
    }).catch(function (e) {
      err = (e && e.name === 'NotAllowedError')
        ? 'Microphone blocked — allow it in the address bar and try again.'
        : 'No microphone available.';
      fire();
      return false;
    });
  }

  function leave() {
    if (!on) return;
    Object.keys(peers).forEach(drop);
    if (local) local.getTracks().forEach(function (t) { t.stop(); });
    local = null; on = false; muted = false; speaking = false; level = 0;
    send({ t: 'voice', on: false });
    fire();
  }

  function toggleMute() {
    if (!on) return;
    muted = !muted;
    local.getAudioTracks().forEach(function (t) { t.enabled = !muted; });
    send({ t: 'voice', on: true, muted: muted });
    fire();
  }

  root.CGVoice = {
    setup: function (o) { send = o.send; onChange = o.onChange; self = o.self; },
    join: join, leave: leave, toggle: function () { return on ? leave() : join(); },
    toggleMute: toggleMute,
    signal: signal, roster: roster, state: state,
    /* the music bed gets out of the way while somebody is talking */
    anyoneTalking: function () { return state().talking.length > 0; },
    reset: function () { if (on) leave(); self = null; }
  };
})(typeof window !== 'undefined' ? window : this);
