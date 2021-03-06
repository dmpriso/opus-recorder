var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require("sinon-chai");
var requireUncached = require('require-uncached');
var Promise = require('promise');

chai.use(sinonChai);
var should = chai.should();
var expect = chai.expect;


describe('Recorder unsupported', function(){

  var Recorder = require('../dist/recorder.min');

  it('should not support Recording', function () {
    expect(Recorder.isRecordingSupported()).to.not.be.ok;
  });

  it('should throw an error', function () {
    expect(Recorder).to.throw("Recording is not supported in this browser");
  });

});

describe('Recorder', function(){


  var Recorder;

  var requireRecorder = function(){
    Recorder = requireUncached('../dist/recorder.min');
    sinon.spy(Recorder.prototype, 'ondataavailable');
    sinon.spy(Recorder.prototype, 'onstart');
    sinon.spy(Recorder.prototype, 'onstop');
    sinon.spy(Recorder.prototype, 'onpause');
    sinon.spy(Recorder.prototype, 'onresume');
  };

  beforeEach(function(){
    var messageHandlers = [];

    const nodeAddEventListener = sinon.spy(function( event, callback ) {
      if(event == 'message') {
        messageHandlers.push(callback);
      }
    });

    const nodeRemoveEventListener = sinon.spy(function( event, callback ) {
      if ( event == 'message' ) {
        var index = messageHandlers.indexOf(callback);
        if ( index > -1 ) {
          messageHandlers.splice(index, 1);
        }
      }
    });

    const nodePostMessage = sinon.spy(function( message ) {
      // run callbacks in next tick
      global.Promise.resolve().then(() => {
        var handlers = messageHandlers.slice(0);
        function call(e) {
          handlers.forEach(h => h(e));
        }

        switch (message['command']) {
          case 'init':
            return call({data: {message: 'ready'}});
          case 'done':
            return call({data: {message: 'done'}});
          case 'flush':
            return call({data: {message: 'flushed'}});
        }
      });
    });


    global.AudioContext = sinon.stub();

    global.AudioContext.prototype.resume = sinon.stub().resolves();

    global.AudioContext.prototype.createGain = () => {
      return {
        connect: sinon.stub(),
        disconnect: sinon.stub(),
        gain: {
          setTargetAtTime: sinon.stub()
        }
      };
    };

    global.AudioContext.prototype.createScriptProcessor = sinon.stub().returns({
      connect: sinon.stub(),
      disconnect: sinon.stub()
    });

    global.AudioContext.prototype.createMediaStreamSource = sinon.stub().returns({ 
      connect: sinon.stub(),
      disconnect: sinon.stub()
    });

    global.AudioContext.prototype.sampleRate = 44100;
    global.AudioContext.prototype.close = sinon.stub().resolves();
    global.AudioContext.prototype.audioWorklet = {
      addModule: sinon.stub().resolves()
    };

    global.AudioWorkletNode = sinon.stub().returns({ 
      connect: sinon.stub(),
      disconnect: sinon.stub(),
      port: {
        addEventListener: nodeAddEventListener,
        removeEventListener: nodeRemoveEventListener,
        postMessage: nodePostMessage,
        start: sinon.stub()
      }
    });

    global.Event = sinon.stub();
    global.CustomEvent = sinon.stub();
    global.ErrorEvent = sinon.stub();

    global.navigator = {};
    global.navigator.mediaDevices = {};
    global.navigator.mediaDevices.getUserMedia = sinon.stub().resolves({
      stop: sinon.stub()
    });

    global.Worker = sinon.stub();
    global.Worker.prototype.addEventListener = nodeAddEventListener;
    global.Worker.prototype.removeEventListener = nodeRemoveEventListener;
    global.Worker.prototype.postMessage = nodePostMessage;

    global.Promise = Promise;

    requireRecorder();
  });

  var mockWebkit = function(){
    delete global.AudioContext;
    global.webkitAudioContext = sinon.stub();
    global.webkitAudioContext.prototype.createGain = () => {
      return {
        connect: sinon.stub(),
        disconnect: sinon.stub(),
        gain: {
          setTargetAtTime: sinon.stub()
        }
      };
    };
    global.webkitAudioContext.prototype.createScriptProcessor = sinon.stub().returns({
      connect: sinon.stub(),
      disconnect: sinon.stub()
    });
    global.webkitAudioContext.prototype.createMediaStreamSource = sinon.stub().returns({ 
      connect: sinon.stub(),
      disconnect: sinon.stub()
    });
    global.webkitAudioContext.prototype.sampleRate = 44100;
    requireRecorder();
  };

  afterEach(function () {
    sinon.restore();
  });

  it('should support Recording', function () {
    expect(Recorder.isRecordingSupported()).to.be.ok;
  });

  it('should have version', function () {
    const { version } = require('../package.json');
    expect(Recorder.version).to.equal(version);
  });

  it('should create an instance without config', function () {
    var rec = new Recorder();
    expect(rec.state).to.equal('inactive');
    expect(rec.config).to.have.property('bufferLength', 4096);
    expect(rec.config).to.have.property('recordingGain', 1);
    expect(rec.config).to.have.property('monitorGain', 0);
    expect(rec.config).to.have.property('numberOfChannels', 1);
    expect(rec.config).to.have.property('encoderSampleRate', 48000);
    expect(rec.config).to.have.property('encoderPath', 'encoderWorker.min.js');
    expect(rec.config).to.have.property('streamPages', false);
    expect(rec.config).to.have.property('maxFramesPerPage', 40);
    expect(rec.config).to.have.property('mediaTrackConstraints', true);
    expect(rec.config).to.have.property('encoderApplication', 2049);
    expect(rec.config).to.have.property('encoderFrameSize', 20);
    expect(rec.config).to.have.property('resampleQuality', 3);
    expect(rec.config).to.have.property('wavBitDepth', 16);
    expect(rec.config).to.have.property('emitRawFrames', false);
  });

  it('should support Recording with Safari Webkit', function () {
    mockWebkit();
    expect(Recorder.isRecordingSupported()).to.be.ok;
  });

  it('should create an instance with Safari Webkit', function () {
    mockWebkit();
    var rec = new Recorder();
    expect(rec.state).to.equal('inactive');
    expect(rec.config).to.have.property('bufferLength', 4096);
    expect(rec.config).to.have.property('recordingGain', 1);
    expect(rec.config).to.have.property('monitorGain', 0);
    expect(rec.config).to.have.property('numberOfChannels', 1);
    expect(rec.config).to.have.property('encoderSampleRate', 48000);
    expect(rec.config).to.have.property('encoderPath', 'encoderWorker.min.js');
    expect(rec.config).to.have.property('streamPages', false);
    expect(rec.config).to.have.property('maxFramesPerPage', 40);
    expect(rec.config).to.have.property('mediaTrackConstraints', true);
    expect(rec.config).to.have.property('encoderApplication', 2049);
    expect(rec.config).to.have.property('encoderFrameSize', 20);
    expect(rec.config).to.have.property('resampleQuality', 3);
    expect(rec.config).to.have.property('wavBitDepth', 16);
    expect(rec.config).to.have.property('emitRawFrames', false);
  });

  it('should create an instance with config', function () {
    var rec = new Recorder({
      bufferLength: 2048,
      recordingGain: 0.5,
      monitorGain: 100,
      numberOfChannels: 2,
      bitRate: 16000,
      encoderSampleRate: 16000,
      encoderPath: "../dist/encoderWorker.min.js",
      streamPages: true,
      leaveStreamOpen: false,
      maxFramesPerPage: 1000,
      encoderApplication: 2048,
      encoderFrameSize: 40,
      resampleQuality: 10,
      wavBitDepth: 32,
      emitRawFrames: true
    });

    expect(rec.state).to.equal('inactive');
    expect(rec.config).to.have.property('bufferLength', 2048);
    expect(rec.config).to.have.property('recordingGain', 0.5);
    expect(rec.config).to.have.property('monitorGain', 100);
    expect(rec.config).to.have.property('numberOfChannels', 2);
    expect(rec.config).to.have.property('bitRate', 16000);
    expect(rec.config).to.have.property('encoderSampleRate', 16000);
    expect(rec.config).to.have.property('encoderPath', '../dist/encoderWorker.min.js');
    expect(rec.config).to.have.property('streamPages', true);
    expect(rec.config).to.have.property('maxFramesPerPage', 1000);
    expect(rec.config).to.have.property('encoderApplication', 2048);
    expect(rec.config).to.have.property('encoderFrameSize', 40);
    expect(rec.config).to.have.property('resampleQuality', 10);
    expect(rec.config).to.have.property('wavBitDepth', 32);
    expect(rec.config).to.have.property('emitRawFrames', true);
  });

  it('should start recording', function(){
    var rec = new Recorder();
    return rec.start().then( function(){
      expect(rec.audioContext.resume).to.have.been.calledOnce;
      expect(rec.audioContext.audioWorklet.addModule).to.have.been.calledOnce;
      expect(global.AudioWorkletNode).to.have.been.calledWithNew;
      expect(rec.encoder.addEventListener).to.have.been.calledOnce;
      expect(rec.encoder.addEventListener).to.have.been.calledWith('message');
      expect(rec.state).to.equal('recording');
      expect(rec.sourceNode.connect).to.have.been.calledTwice;
      expect(rec.encoder.postMessage).to.have.been.calledWithMatch({ 
        command: 'init',
        wavSampleRate: 44100,
        originalSampleRate: 44100
      });
    });
  });

  it('should start recording with createScriptProcessor', function(){
    delete global.AudioContext.prototype.audioWorklet;
    var rec = new Recorder();
    return rec.start().then( function(){
      expect(global.Worker).to.have.been.calledWithNew;
      expect(rec.encoder.addEventListener).to.have.been.calledOnce;
      expect(rec.encoder.addEventListener).to.have.been.calledWith('message');
      expect(rec.state).to.equal('recording');
      expect(rec.sourceNode.connect).to.have.been.calledTwice;
      expect(rec.encoder.postMessage).to.have.been.calledWithMatch({ 
        command: 'init',
        wavSampleRate: 44100,
        originalSampleRate: 44100
      });
    });
  });

  it('should start recording with a new audio stream', function(){
    var rec = new Recorder();
    return rec.start().then( function(){
      expect(rec.stream).not.to.be.undefined;
      expect(rec.stream).to.have.property('stop');
      expect(rec.sourceNode).not.to.be.undefined;
      expect(global.navigator.mediaDevices.getUserMedia).to.have.been.calledOnce;
      expect(rec.audioContext.createMediaStreamSource).to.have.been.calledWith(rec.stream);
    });
  });

  it('should close the audio context', function () {
    var rec = new Recorder();
    return rec.close().then(function(){
      expect(rec.stream).to.be.undefined;
      expect(rec.audioContext.close).to.have.been.calledOnce;
    });
  });

  it('should start recording with a supplied audio stream', function(){
    var context = new AudioContext();
    var stream = context.createMediaStreamSource();
    stream.context = context;

    var rec = new Recorder({sourceNode: stream});
    return rec.start().then( function(){
      expect(rec.stream).to.be.undefined;
      expect(rec.config.sourceNode).not.to.be.undefined;
    });
  });

  it('should not close the audio context with supplied audio stream', function () {
    var context = new AudioContext();
    var stream = context.createMediaStreamSource();
    stream.context = context;

    var rec = new Recorder({sourceNode: stream});
    return rec.close().then(function(){
      expect(rec.stream).to.be.undefined;
      expect(global.AudioContext.prototype.close).not.to.have.been.called;
    });
  });

  it('should clear the audio stream when stream contains tracks', function () {
    var stopTrack1 = sinon.stub();
    var stopTrack2 = sinon.stub();
    global.navigator.mediaDevices.getUserMedia = sinon.stub().resolves({
      getTracks: sinon.stub().returns([
        { stop: stopTrack1 },
        { stop: stopTrack2 }
      ])
    });

    var rec = new Recorder();
    return rec.start().then(function(){
      expect(rec.stream).to.not.be.undefined;
      rec.stop();
      expect(stopTrack1).to.have.been.calledOnce;
      expect(stopTrack2).to.have.been.calledOnce;
    });
  });

  it('should stop recording', function () {
    var rec = new Recorder();
    var clearStreamSpy = sinon.spy(rec, 'clearStream');
    return rec.start().then(function(){
      rec.stop();
      expect(rec.state).to.equal('inactive');
      expect(rec.monitorGainNode.disconnect).to.have.been.calledOnce;
      expect(rec.recordingGainNode.connect).to.have.been.calledTwice;
      expect(clearStreamSpy).to.have.been.calledOnce;
      expect(rec.encoder.postMessage).to.have.been.calledWithMatch({ command: 'done' });
    });
  });

  it('the stop promise should only return when finished', function () {
      var rec = new Recorder();
      var encoder;
      var clearStreamSpy = sinon.spy(rec, 'clearStream');
      var finishSpy = sinon.spy(rec, 'finish');
      return rec.start().then(function() {
        encoder = rec.encoder;
        return rec.stop();
      }).then(function() {
        expect(rec.state).to.equal('inactive');
        expect(rec.monitorGainNode.disconnect).to.have.been.calledOnce;
        expect(rec.recordingGainNode.connect).to.have.been.calledTwice;
        expect(clearStreamSpy).to.have.been.calledOnce;
        expect(finishSpy).to.have.been.calledOnce;
        expect(rec.onstop).to.have.been.calledOnce;
        expect(encoder.postMessage).to.have.been.calledWithMatch({ command: 'done' });
      });
  });

  it('Supports pause and resume', function () {
    var rec = new Recorder();
    return rec.start().then(function() {
      return rec.pause();
    }).then(function() {
      expect(rec.state).to.equal('paused');
      expect(rec.recordingGainNode.disconnect).to.have.been.calledOnce;
      expect(rec.onpause).to.have.been.calledOnce;
      expect(rec.encoder.postMessage).not.to.have.been.calledWithMatch({ command: 'flush' });

      rec.resume();
      expect(rec.state).to.equal('recording');
      expect(rec.recordingGainNode.connect).to.have.been.calledTwice;
    });
  });

  it('Supports flushing pause and resume', function () {
    var rec = new Recorder({streamPages: true});
    return rec.start().then(function() {
      var promise = rec.pause(true);
      expect(rec.state).to.equal('paused');
      expect(rec.onpause).not.to.have.been.called;
      expect(rec.encoder.postMessage).to.have.been.calledWithMatch({ command: 'flush' });
      return promise;
    }).then(function() {
      expect(rec.state).to.equal('paused');
      expect(rec.onpause).to.have.been.calledOnce;

      rec.resume();
      expect(rec.state).to.equal('recording');
    });
  });

  it('should set the recording gain', function () {
    var rec = new Recorder();
    return rec.start().then(function() {
      rec.setRecordingGain(0.3);
      expect(rec.config.recordingGain).to.equal(0.3);
    });
  });

  it('should call start promise catch', function () {
    global.navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error('PermissionDeniedError'));
    var rec = new Recorder();
    return rec.start().then( function(){ 
      throw new Error('Unexpected promise resolving.');
    }, function( ev ){
      expect(rec.state).to.equal('inactive');
      expect(ev).instanceof(Error);
      expect(ev.message).to.equal('PermissionDeniedError')
    });
  });

});
