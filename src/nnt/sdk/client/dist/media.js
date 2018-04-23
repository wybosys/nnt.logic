"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DataMedia = /** @class */ (function () {
    function DataMedia(data) {
        this._data = data;
    }
    DataMedia.prototype.save = function (cb) {
        cb(this._data);
    };
    return DataMedia;
}());
exports.DataMedia = DataMedia;
var UrlMedia = /** @class */ (function () {
    function UrlMedia(url) {
        this._url = url;
    }
    UrlMedia.prototype.save = function (cb) {
        cb(this._url);
    };
    return UrlMedia;
}());
exports.UrlMedia = UrlMedia;
