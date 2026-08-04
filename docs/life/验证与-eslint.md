---
title: 验证与 ESLint
order: ""
---
这一页主要讲两件事：

1. 如何在后端和数据库层面对数据进行验证。
2. 如何使用 ESLint 对 JavaScript 代码进行静态检查和格式规范。

可以按下面的逻辑理解。

**一、为什么需要数据验证**

应用程序不能接受所有输入。例如，创建笔记时：

- `content` 字段不能缺失；
- `content` 不能是空字符串；
- `content` 至少需要有一定长度；
- 电话号码必须符合规定格式。

如果不做验证，非法数据可能被保存进数据库，导致后续查询、显示或业务逻辑出现问题。

最简单的做法是在路由处理函数中手动检查：

```js
if (!body.content) {
  return response.status(400).json({
    error: 'content missing'
  })
}
```

这里的关键点是：

- `400 Bad Request` 表示客户端提交的数据不符合要求；
- `return` 很重要，可以避免验证失败后继续执行保存逻辑；
- 这种方式适合简单检查，但当规则变多时，路由代码会越来越复杂。

**二、使用 Mongoose Schema 验证数据**

更合理的方式是把验证规则放在 Mongoose 的 Schema 中：

```js
const noteSchema = new mongoose.Schema({
  content: {
    type: String,
    minLength: 5,
    required: true
  },
  important: Boolean
})
```

这里定义了三个方面：

- `type: String`：字段必须是字符串；
- `minLength: 5`：字符串长度至少为 5；
- `required: true`：字段必须存在。

`important` 没有添加额外验证，所以仍然只是一个布尔字段。

这种方式的好处是：

- 验证规则集中在数据模型中；
- 所有保存该模型的代码都会受到规则约束；
- 路由处理函数不需要重复实现相同的验证逻辑；
- 数据库层的约束更加可靠。

Mongoose 自带的验证器包括：

- `required`
- `minLength`
- `maxLength`
- `min`
- `max`
- 类型验证等

如果内置验证器无法满足需求，还可以使用自定义验证器。

**三、验证失败时会发生什么**

当数据违反 Schema 中的规则时，执行：

```js
note.save()
```

会抛出异常。

因此，创建笔记的路由需要把异常传递给统一的错误处理中间件：

```js
note.save()
  .then(savedNote => {
    response.json(savedNote)
  })
  .catch(error => next(error))
```

这里的 `next(error)` 表示：

1. 当前路由不再自行处理错误；
2. 把错误交给 Express 的错误处理中间件；
3. 由统一的地方决定返回什么状态码和错误信息。

**四、统一处理不同类型的错误**

错误处理中间件可以根据 `error.name` 区分错误类型：

```js
const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({
      error: 'malformatted id'
    })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({
      error: error.message
    })
  }

  next(error)
}
```

本页重点介绍了两类错误。

**1. `CastError`**

通常出现在 ID 格式不正确时，例如：

```text
/api/notes/not-a-valid-id
```

服务器返回：

```text
400 Bad Request
malformatted id
```

**2. `ValidationError`**

当请求数据违反 Mongoose Schema 的验证规则时出现，例如：

- `content` 缺失；
- `content` 长度少于 5 个字符；
- 电话号码格式错误。

服务器通常返回：

- 状态码：`400`
- 内容：Mongoose 生成的错误消息

错误处理中间件的整体价值是：不同路由可以共享一套错误处理逻辑，避免每个路由重复编写错误响应代码。

**五、部署到生产环境**

验证功能完成后，需要把后端部署到 Fly.io 或 Render。

这一部分的核心是：生产环境必须能够访问 MongoDB。

本地开发时，数据库连接地址通常写在 `.env` 文件中，例如：

```env
MONGODB_URI=mongodb+srv://...
```

但生产环境不会自动读取你本地的 `.env` 文件，所以必须在部署平台配置环境变量。

在 Fly.io 中，可以使用：

```bash
fly secrets set MONGODB_URI='mongodb+srv://...'
```

在 Render 中，则需要在控制台的环境变量设置中添加：

```text
MONGODB_URI
```

部署时常见的问题包括：

- 数据库 URL 没有配置；
- 数据库 URL 的变量名写错；
- MongoDB Atlas 没有允许部署平台访问；
- 前端请求接口一直处于 `pending`；
- 最终返回 `502`。

排查这类问题时，应该同时查看：

1. 浏览器开发者工具的 Network 面板；
2. 浏览器控制台；
3. 部署平台的服务端日志。

例如，如果日志中出现：

```text
database URL is undefined
```

就说明生产环境没有设置 `MONGODB_URI`。

另外，MongoDB Atlas 还需要配置网络访问权限。由于 Fly.io 不一定提供固定的 IPv4 地址，所以课程中建议允许所有 IP 地址访问。实际生产环境中应根据平台能力和安全要求谨慎配置。

**六、练习 3.19：验证姓名长度**

电话簿应用需要增加姓名验证：

```js
name: {
  type: String,
  minLength: 3,
  required: true
}
```

后端验证失败后，前端需要显示错误信息：

```js
personService
  .create(newPerson)
  .then(createdPerson => {
    // 更新页面
  })
  .catch(error => {
    console.log(error.response.data.error)
  })
```

错误信息的访问路径是：

```js
error.response.data.error
```

它的结构通常表示：

- `error`：请求错误对象；
- `response`：服务器响应；
- `data`：响应体；
- `error`：后端返回的具体错误消息。

本页还特别提醒：

> Mongoose 在执行 `update` 时，默认不会启用验证器。

如果希望更新操作也执行 Schema 验证，需要在更新选项中显式设置：

```js
{ runValidators: true }
```

**七、练习 3.20：自定义电话号码验证**

电话号码必须满足：

1. 总长度至少为 8；
2. 分成两部分；
3. 两部分之间用一个 `-` 分隔；
4. 第一部分是 2 或 3 位数字；
5. 第二部分全部是数字。

有效示例：

```text
09-1234556
040-22334455
```

无效示例：

```text
1234556
1-22334455
10-22-334455
```

这类规则适合使用正则表达式和自定义验证器。

例如，可以使用类似这样的表达式：

```js
/^\d{2,3}-\d+$/
```

然后在 Schema 中定义自定义验证：

```js
number: {
  type: String,
  validate: {
    validator: value => /^\d{2,3}-\d+$/.test(value),
    message: props => `${props.value} is not a valid phone number`
  }
}
```

这个正则表达式的含义是：

- `^`：字符串开始；
- `\d{2,3}`：2 到 3 个数字；
- `-`：必须有一个连字符；
- `\d+`：后面至少有一个数字；
- `$`：字符串结束。

如果 POST 请求提交无效电话号码，后端应该返回：

- 合适的错误状态码，通常是 `400`；
- 清晰的错误消息。

**八、练习 3.21：部署全栈版本**

本练习要求：

1. 构建前端生产版本；
2. 把构建结果复制到后端仓库；
3. 让后端提供前端静态文件；
4. 在本地通过 `http://localhost:3001/` 验证；
5. 将完整应用部署到 Fly.io 或 Render；
6. 验证线上应用的所有操作。

本页强调：

> 这一章的部署方式是由后端提供前端，而不是单独部署前端。

也就是说，最终结构是：

```text
浏览器
  ↓
后端服务器
  ├── API 接口
  └── 前端静态文件
```

**九、什么是 lint**

Lint 是一种静态代码分析工具，用来在程序运行前检查代码。

它可以发现：

- 语法错误；
- 未使用的变量；
- 未定义的变量；
- 不推荐的写法；
- 格式不统一；
- 潜在的逻辑问题。

JavaScript 生态中最常见的工具是 ESLint。

ESLint 不会运行你的程序，而是直接读取源代码并分析代码结构。

**十、安装 ESLint**

ESLint 应该安装为开发依赖：

```bash
npm install eslint @eslint/js --save-dev
```

开发依赖的特点是：

- 开发时需要；
- 测试时可能需要；
- 生产环境运行应用时通常不需要。

安装后，`package.json` 中会增加：

```json
"devDependencies": {
  "@eslint/js": "^9.22.0",
  "eslint": "^9.22.0"
}
```

然后初始化配置：

```bash
npx eslint --init
```

配置会保存到：

```text
eslint.config.mjs
```

**十一、配置 ESLint 的语言环境**

基础配置大致如下：

```js
import globals from 'globals'

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      },
      ecmaVersion: 'latest'
    }
  }
]
```

几个重要配置如下。

**`files`**

```js
files: ['**/*.js']
```

表示检查项目中的 JavaScript 文件。

**`sourceType`**

```js
sourceType: 'commonjs'
```

表示项目使用 CommonJS 模块系统，也就是：

```js
const express = require('express')
```

而不是 ES Module：

```js
import express from 'express'
```

**`globals`**

```js
globals: {
  ...globals.node
}
```

告诉 ESLint 这是 Node.js 环境，因此允许使用：

- `process`
- `__dirname`
- `require`
- `module`

浏览器项目则可以配置：

```js
...globals.browser
```

**`ecmaVersion`**

```js
ecmaVersion: 'latest'
```

表示使用最新的 ECMAScript 语法标准。

**十二、启用 ESLint 推荐规则**

通过 `@eslint/js` 引入推荐配置：

```js
import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    // 自定义配置
  }
]
```

推荐配置可以帮助检查一些常见问题，例如：

- 使用未定义变量；
- 定义变量但没有使用；
- 某些明显的代码错误。

推荐配置应该放在配置数组前面，然后再添加自己的规则。

**十三、添加代码风格规则**

安装样式插件：

```bash
npm install --save-dev @stylistic/eslint-plugin-js
```

然后添加样式规则：

```js
import stylisticJs from '@stylistic/eslint-plugin-js'

export default [
  {
    plugins: {
      '@stylistic/js': stylisticJs
    },
    rules: {
      '@stylistic/js/indent': ['error', 2],
      '@stylistic/js/linebreak-style': ['error', 'unix'],
      '@stylistic/js/quotes': ['error', 'single'],
      '@stylistic/js/semi': ['error', 'never']
    }
  }
]
```

这些规则分别表示：

- 缩进使用 2 个空格；
- 换行使用 Unix 风格的 LF；
- 字符串使用单引号；
- 不使用分号。

Windows 用户需要特别注意：

```text
Expected linebreaks to be 'LF' but found 'CRLF'
```

如果出现这个问题，需要让编辑器使用 LF 换行格式。

**十四、添加更多规则**

页面还介绍了几个常用规则：

```js
eqeqeq: 'error'
```

要求使用严格相等：

```js
a === b
```

而不是：

```js
a == b
```

```js
'no-trailing-spaces': 'error'
```

禁止行尾多余空格。

```js
'object-curly-spacing': ['error', 'always']
```

要求大括号内部有空格：

```js
const object = { name: 'Alice' }
```

```js
'arrow-spacing': ['error', { before: true, after: true }]
```

要求箭头函数的箭头两边有空格：

```js
const add = (a, b) => a + b
```

```js
'no-console': 'off'
```

关闭 `console.log` 的警告。

规则的级别可以使用：

- `'error'`：错误；
- `'warn'`：警告；
- `'off'` 或 `0`：关闭。

**十五、运行 ESLint**

检查单个文件：

```bash
npx eslint index.js
```

检查整个项目：

```bash
npx eslint .
```

推荐在 `package.json` 中添加脚本：

```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js",
  "lint": "eslint ."
}
```

之后运行：

```bash
npm run lint
```

就可以检查整个项目。

如果不希望检查前端构建后的 `dist` 目录，可以配置：

```js
{
  ignores: ['dist/**']
}
```

这样 ESLint 就会忽略 `dist` 中的文件。

**十六、整页知识结构**

这页的完整逻辑可以概括为：

```text
用户提交数据
  ↓
路由接收请求
  ↓
Mongoose Schema 验证
  ↓
验证成功：保存到数据库
  ↓
验证失败：抛出 ValidationError
  ↓
next(error)
  ↓
错误处理中间件
  ↓
返回 400 和错误消息
```

部署部分则是：

```text
本地环境变量
  ↓
生产环境必须单独配置数据库 URL
  ↓
检查 MongoDB Atlas 网络访问权限
  ↓
查看浏览器 Network 和服务端日志
  ↓
验证线上全栈应用
```

代码质量部分是：

```text
安装 ESLint
  ↓
配置 JavaScript 环境
  ↓
启用推荐规则
  ↓
添加代码风格规则
  ↓
配置 npm run lint
  ↓
修复所有警告和错误
```

**核心记忆点**

- 验证规则最好放在 Mongoose Schema 中。
- `required` 用来限制字段缺失。
- `minLength` 用来限制字符串最小长度。
- 自定义格式要求可以使用自定义验证器。
- Mongoose 验证失败时通常会产生 `ValidationError`。
- 路由通过 `next(error)` 把异常交给错误处理中间件。
- 验证错误通常返回 `400 Bad Request`。
- `update` 操作默认不运行验证器，需要设置 `runValidators: true`。
- 生产环境必须单独设置 `MONGODB_URI`。
- MongoDB Atlas 必须允许生产服务器访问。
- ESLint 用于静态分析和代码风格统一。
- `npm run lint` 可以检查整个项目。
- `dist` 等构建目录通常应加入 ESLint 的忽略列表。
- 最后的练习是为电话簿添加字段验证、电话号码格式验证、部署全栈应用，并配置 ESLint。
