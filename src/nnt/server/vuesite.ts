import {WebPage} from "./webpage";
import {expand} from "../../nnt/core/url";
import {Node} from "../config/config";
import {static_cast} from "../core/core";
import {IndexedObject} from "../core/kernel";
import webpack = require('webpack');
import webpackDevMiddleware = require('webpack-dev-middleware');
import express = require("express");

interface VueConfig {

    // 是否开启ts模式
    typescript?: boolean;
}

export class VueSite extends WebPage {

    compiler: webpack.Compiler;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<VueConfig>(cfg);
        this.ts = c.typescript;
        return true;
    }

    ts: boolean;

    main() {
        const app = this._app;
        let rules: IndexedObject[] = [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                options: {
                    loaders: {}
                }
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                loader: 'file-loader',
                options: {
                    name: '[name].[ext]?[hash]',
                    publicPath: ""
                }
            },
            {
                test: /\.css$/,
                use: [
                    {loader: "style-loader"},
                    {loader: "css-loader"}
                ]
            },
            {
                test: /\.js$/,
                loader: 'babel-loader',
                include: [expand(this.root)]
            },
            {
                test: /.(png|woff|woff2|eot|ttf|svg)$/,
                loader: 'url-loader?limit=100000'
            }
        ];
        let sets: IndexedObject = {
            entry: expand(this.root + "/" + this.index),
            output: {
                publicPath: "/dist/",
                filename: "build.js"
            },
            module: {
                rules: rules
            },
            resolve: {
                extensions: ['.js', '.vue', '.json', '.ts'],
                alias: {
                    'vue$': 'vue/dist/vue.esm.js'
                }
            },
            performance: {
                hints: false
            },
            devtool: "#eval-source-map"
        };
        if (this.ts) {
            rules.push({
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    appendTsSuffixTo: [/\.vue$/],
                }
            });
        }
        this.compiler = webpack(sets);
        app.use(webpackDevMiddleware(this.compiler, <any>{
            noInfo: true,
            publicPath: null
        }));
        app.use("/", express.static(expand(this.root)));
    }

}