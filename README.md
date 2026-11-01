# ETHER Field Notes

一个中文项目便签应用。使用 Node 内置模块和原生 HTML、CSS、JavaScript，无需安装依赖。

## 运行

需要 Node.js 20 或更新版本。

```sh
npm start
```

打开 http://127.0.0.1:3000 。可通过 `PORT=4000 npm start` 更改端口。服务仅监听本机。

```sh
npm test
```

## 数据与接口

便签保存在 `data/notes.json`，首次保存时自动创建。重启服务后仍会读取该文件。测试使用临时数据目录，不会修改正式数据文件。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/notes?q=关键词` | 列出便签，按标题或内容搜索 |
| POST | `/api/notes` | 新增便签 |
| PUT | `/api/notes/:id` | 修改便签 |
| DELETE | `/api/notes/:id` | 删除便签 |

新增和修改请求提交 JSON：`{"title":"标题","content":"内容"}`。标题最多 120 字，内容最多 10000 字，均不能为空。接口返回 JSON；错误返回 `{"error":"说明"}`。
