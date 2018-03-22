#!/usr/bin/env python3

import datetime
import json
import os
import shutil
import subprocess

print("准备环境")
# subprocess.run(["cnpm", "install"])

print("开始编译")
subprocess.run(["tsc"])

def enablenodes(nodes):
    r = []
    for each in nodes:
        if nodeisenable(each):
            r.append(each)
    return r


def nodeisenable(node):
    if "enable" not in node:
        return True
    if node["enable"].find("release") != -1:
        return True
    if node["enable"].find("distribution") != -1:
        return True
    return False


print("拷贝到临时目录")
os.mkdir("build_distribute")
os.chdir("build_distribute")

# 处理app.json，移出不需要的配置
appjs = json.load(open("../app.json"))
json.dump({
    "config": appjs["config"],
    "server": enablenodes(appjs["server"]),
    "dbms": enablenodes(appjs["dbms"]),
    "logger": enablenodes(appjs["logger"]),
    "container": appjs["container"]
}, open("./app.json", "w"), indent=4, ensure_ascii=False)

shutil.copytree("../3rd", "./3rd")
shutil.copytree("../bin", "./bin")
shutil.copytree("../src/contrib", "./src/contrib")
shutil.copytree("../src/nnt/sdk/client/dist", "./src/nnt/sdk/client/dist")
shutil.copytree("../config", "./config")
shutil.copy("../package.json", "./package.json")
shutil.copy("../index.js", "./index.js")
os.chdir("../")

name = datetime.datetime.today().strftime("%Y%m%d%H%M") + ".tar.gz"
print("生成压缩包 " + name)
subprocess.run(["tar", "-cf", name, "./build_distribute"])

shutil.rmtree("build_distribute")
