"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var service_1 = require("../service");
var worker_1 = require("../worker");
var audiolibs_1 = require("../audiolibs");
var media_1 = require("../media");
var PLAYING = false;
var RECORDING = false;
var H5AudioRecorder = /** @class */ (function (_super) {
    __extends(H5AudioRecorder, _super);
    function H5AudioRecorder() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.bufferlen = 4096; // 缓冲区大小
        _this.channels = 1; // 通道数量
        return _this;
    }
    H5AudioRecorder.IsValid = function (cb) {
        if (H5AudioRecorder._VALID != null) {
            return H5AudioRecorder._VALID;
        }
        if (typeof AudioContext != "undefined") {
            H5AudioRecorder._VALID = false;
            cb(false);
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function () {
            H5AudioRecorder._VALID = true;
            cb(true);
        }).catch(function () {
            H5AudioRecorder._VALID = false;
            cb(false);
        });
    };
    // 开始录音
    H5AudioRecorder.prototype.start = function (cb) {
        var _this = this;
        if (PLAYING) {
            cb && cb(new Error("正在回放"));
            return;
        }
        if (RECORDING) {
            cb && cb(new Error("正在录音"));
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            try {
                _this._ctx = new AudioContext();
                RECORDING = true;
                _this.doStart(stream, cb);
            }
            catch (err) {
                cb && cb(err);
            }
        }).catch(function () {
            cb && cb(new Error("当前设备不支持录音"));
        });
    };
    // 结束录音或者结束回放
    H5AudioRecorder.prototype.stop = function (cb) {
        if (RECORDING) {
            this._cbStopped = cb;
            // 先提取出wav数据
            this._recorder.postMessage({
                command: "exportWAV",
                type: "audio/wav"
            });
        }
        else if (PLAYING) {
            PLAYING = false;
            this._player.pause();
            this._player = null;
            cb && cb(null);
        }
        else {
            cb && cb(null);
        }
    };
    // 回放录音
    H5AudioRecorder.prototype.play = function (cb) {
        var _this = this;
        if (PLAYING) {
            cb && cb(new Error("正在回放"));
            return;
        }
        if (RECORDING) {
            cb && cb(new Error("正在录音"));
            return;
        }
        PLAYING = true;
        var reader = new FileReader();
        reader.onload = function (e) {
            _this._player = new Audio(e.target.result);
            _this._player.addEventListener("ended", function () {
                PLAYING = false;
            });
            _this._player.play();
            cb && cb(null);
        };
        reader.onerror = function (e) {
            PLAYING = false;
            cb && cb(new Error("录音失败"));
        };
        reader.readAsDataURL(this._data);
    };
    H5AudioRecorder.prototype.doStart = function (stream, cb) {
        var _this = this;
        var source = this._ctx.createMediaStreamSource(stream);
        var node = this._ctx.createScriptProcessor(this.bufferlen, this.channels, this.channels);
        this._recorder = worker_1.WorkerFromString(audiolibs_1.WORKER_RECORDER);
        this._recorder.postMessage({
            command: "init",
            config: {
                sampleRate: this._ctx.sampleRate,
                numChannels: this.channels
            }
        });
        node.onaudioprocess = function (e) {
            if (!_this._recorder)
                return;
            var buffers = [];
            for (var i = 0; i < _this.channels; ++i)
                buffers.push(e.inputBuffer.getChannelData(i));
            _this._recorder.postMessage({
                command: "record",
                buffer: buffers
            });
        };
        this._recorder.onmessage = function (e) {
            _this._data = e.data;
            RECORDING = false;
            // 提取数据成功，关闭
            _this._recorder.postMessage({
                command: "clear"
            });
            _this._recorder.postMessage({
                command: "exit"
            });
            _this._recorder = null;
            _this._ctx.close();
            _this._ctx = null;
            if (_this._cbStopped) {
                // 结束后自动转换成media对象
                _this.doStop(_this._cbStopped);
                _this._cbStopped = null;
            }
        };
        source.connect(node);
        node.connect(this._ctx.destination);
        cb && cb(null);
    };
    H5AudioRecorder.prototype.doStop = function (cb) {
        var _this = this;
        // 从服务器上启动mp3编码服务
        worker_1.StartService("mp3encoder.js", function (worker) {
            if (!worker) {
                cb(null);
                return;
            }
            var reader = new FileReader();
            reader.onload = function (e) {
                worker.postMessage({
                    cmd: "init",
                    config: {
                        channels: 1,
                        mode: 3,
                        samplerate: _this.sampleRate ? _this.sampleRate : null,
                        bitrate: _this.bitRate ? _this.bitRate : null
                    }
                });
                var arrbuf = e.target.result;
                var buffer = new Uint8Array(arrbuf);
                var wav = ParseWav(buffer);
                worker.onmessage = function (e) {
                    if (e.data.cmd != "data")
                        return;
                    var mp3Blob = new Blob([new Uint8Array(e.data.buf)], { type: 'audio/mpeg' });
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        cb(new media_1.DataMedia(e.target.result));
                    };
                    reader.readAsDataURL(mp3Blob);
                };
                worker.postMessage({
                    cmd: "encode",
                    buf: Uint8ArrayToFloat32Array(wav.samples)
                });
                worker.postMessage({
                    cmd: "finish"
                });
            };
            reader.readAsArrayBuffer(_this._data);
        });
    };
    return H5AudioRecorder;
}(service_1.AudioRecorder));
exports.H5AudioRecorder = H5AudioRecorder;
function Uint8ArrayToFloat32Array(u8a) {
    var f32Buffer = new Float32Array(u8a.length);
    for (var i = 0; i < u8a.length; i++) {
        var value = u8a[i << 1] + (u8a[(i << 1) + 1] << 8);
        if (value >= 0x8000)
            value |= ~0x7FFF;
        f32Buffer[i] = value / 0x8000;
    }
    return f32Buffer;
}
function ParseWav(wav) {
    function readInt(i, bytes) {
        var ret = 0, shft = 0;
        while (bytes) {
            ret += wav[i] << shft;
            shft += 8;
            i++;
            bytes--;
        }
        return ret;
    }
    if (readInt(20, 2) != 1)
        throw 'Invalid compression code, not PCM';
    if (readInt(22, 2) != 1)
        throw 'Invalid number of channels, not 1';
    return {
        sampleRate: readInt(24, 4),
        bitsPerSample: readInt(34, 2),
        samples: wav.subarray(44)
    };
}
