# 小游戏大厅

小游戏集合站，静态游戏前端配有可选的访问统计服务，包含游戏大厅、搜索分类、收藏、最近游玩、深浅色主题和统一游玩页。已接入 Rooftop Reset、2048、贪吃蛇和打砖块，桌面端支持键盘，手机端支持触屏。四张插画封面按设计参考重绘，全部卡片均可直接游玩。

## 已收录游戏

| 游戏 | 玩法和操作 | 保存内容 |
| --- | --- | --- |
| Rooftop Reset | 六层平台跳跃，键盘或游戏内触屏摇杆 | 最佳成绩，本局检查点 |
| 2048 | 方向键 / WASD、滑动棋盘或方向按钮；达到 2048 可继续 | 当前棋盘、得分、最佳成绩 |
| 贪吃蛇 | 方向键 / WASD、滑动或方向按钮；吃苹果加速，碰墙或自身结束 | 最佳成绩 |
| 打砖块 | 鼠标、左右键 / AD、拖动或方向按钮；50 关、逐行下移、每关 3 条生命 | 最佳成绩、关卡起点和入关分数 |

三款新增游戏都提供暂停、继续和新一局功能，离开窗口或打开操作说明会暂停。

三款游戏均内置原创合成背景音乐及操作、得分、失败和通关音效，无需下载音频素材。首次点击游戏或按键后启用声音；工具栏“声音：开 / 关”可切换，设置在三款游戏之间共用并保存在当前浏览器。暂停、切到后台或返回大厅时停止声音。

## 部署

解压 `mini-arcade-server.zip` 到网站根目录，确保该目录直接包含 `index.html`、`play.html`、`games.json`、`assets/` 和 `games/`。

例如将压缩包上传到 Linux 服务器后执行：

```sh
sudo mkdir -p /var/www/mini-arcade
sudo unzip mini-arcade-server.zip -d /var/www/mini-arcade
sudo chmod -R a+rX /var/www/mini-arcade
```

在 Nginx 的站点 `server` 配置块中设置：

```nginx
root /var/www/mini-arcade;
index index.html;

location / {
    try_files $uri $uri/ =404;
}
```

保留 Nginx 的标准 `mime.types` 配置，让 `.js` 以 JavaScript 类型返回。修改后执行 `sudo nginx -t`，通过后执行 `sudo systemctl reload nginx`。网站的 iframe 需要允许同源嵌入，已有安全头可以使用 `X-Frame-Options: SAMEORIGIN`，请勿设为 `DENY`。

也可以将整套文件上传到现有站点的子目录，例如 `/arcade/`，然后访问 `https://你的域名/arcade/`。所有站内资源使用相对路径。使用子目录时保留现有站点的静态文件配置即可。

游戏本身无需 npm 安装或构建，仍可纯静态运行。新版访问统计需要额外启动 Python 3.9+ 服务，由 SQLite 文件持久化计数；不需要 pip 或单独安装数据库服务。未部署统计接口时会显示“统计暂不可用”，不影响游戏。JavaScript 模块和游戏清单需要通过 HTTP/HTTPS 提供，请通过网站地址打开。

### 启用今日访问、总访问与今日玩家

给 Hermes 的完整部署交接在 [deploy/HERMES.txt](deploy/HERMES.txt)，systemd 服务与 Nginx 配置也在该目录。必须安装统计服务并配置 `/api/` 反向代理，单独更新静态文件不能启用计数。生产数据库放在 `/var/lib/mini-arcade-stats/visits.sqlite3`，与仓库和站点目录分离。代码更新不会清空数据库。

- 大厅显示全站访问，游玩页显示本游戏的访问。
- 打开或刷新大厅记一次；游戏成功加载记一次。iframe、搜索筛选、暂停、重新开局和每分钟读取统计不重复累计。
- 今日按北京时间 00:00 切日，总访问持续累积。浏览器回退恢复页面只读取统计。
- 今日人数按随机浏览器标识去重，同一浏览器访问不同游戏，全站只计一个人；每个游戏分别去重。清除存储、跨浏览器或跨设备会重复计人。禁用存储时仅计访问、不计人数。
- 游戏访问不等于实际对局数，人数也不是精确真人数或防刷指标。
- 统计从服务启用时开始，不能追溯此前访问。服务只存计数、事件 ID 及当天浏览器标识的摘要，不记录原始浏览器标识、IP 或 User-Agent；Nginx 自身访问日志由部署环境管理。
- 同一事件重试在 7 天内幂等；当天去重摘要在次日写入时清理，历史每日计数和总计数保留。
- `GET /api/stats?page=lobby` 只读取；`POST /api/visits` 记访问。游戏 ID 来自 `games.json`，新增游戏后重启统计服务。

## 本地预览

在解压目录中执行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

浏览器访问 `http://127.0.0.1:8000/`。此命令仅预览静态游戏，不提供访问统计。

同时预览游戏与统计：

```sh
python3 server/stats_server.py --port 46175 --db /tmp/mini-arcade-preview/visits.sqlite3 --static-root .
```

访问 `http://127.0.0.1:46175/`。预览数据仅写入指定的临时数据库，不会提交到仓库或进入部署包。服务仅监听本机；生产静态资源由 Nginx 提供，不使用 `--static-root`。

验证统计规则、并发计数、北京时间跨天与接口：

```sh
python3 -m unittest discover -s tests -v
```

## 新增游戏

1. 将游戏的完整静态文件放入 `games/新游戏ID/`，确认可独立从该子目录启动。
2. 将方形封面放入 `assets/`。建议使用 600 × 600 像素或更大的图片。
3. 在 `games.json` 数组中追加一个对象，注意 JSON 逗号格式。

```json
{
  "id": "my-game",
  "name": "游戏名称",
  "category": "益智",
  "subtitle": "数字解谜",
  "description": "一句话介绍玩法。",
  "cover": "assets/my-game.webp",
  "entry": "games/my-game/index.html",
  "source": "https://example.com/",
  "added": "2026-11-07",
  "devices": ["keyboard", "touch"],
  "featured": false,
  "controls": ["方向键移动", "点击按钮开始游戏"],
  "notes": "在这里说明游戏的规则和进度保存方式。"
}
```

`id` 必须唯一，只使用小写英文字母、数字和连字符。`entry` 和 `cover` 使用本站目录内的相对路径。`source` 是可选的原作链接。`devices` 仅填写游戏实际支持的 `keyboard` 或 `touch`。设为 `featured: true` 的第一款游戏会出现在大厅主推区。分类由清单自动生成。

可选显示字段：`titleArt` 为透明标题图；`featuredCover` 为主推区专用大图；`touchHelp` 为手机端操作提示；`controlHints` 为键盘提示数组，例如 `[["方向键", "移动"], ["P", "暂停"]]`。当前四张封面共享 `assets/game-covers.png`，`coverPosition: [列, 行]` 指定 2 × 2 图集中的位置（索引为 0 或 1）。单张封面不需要这个字段。

新增游戏应自行在页面失焦或进入后台时暂停。大厅打开操作说明时也会向游戏发送同源 `postMessage` 消息 `{ "type": "arcade:pause" }`。游戏如需接入，应校验 `event.origin` 和 `event.source === window.parent` 后执行暂停。四款游戏均已接入这条消息。

默认“重新开始”会重新载入游戏。若游戏提供存档恢复，可设置 `restartMessage: true`，并监听 `{ "type": "arcade:restart" }` 主动清空本局；三款新增游戏通过 `games/shared/ui.js` 实现了该协议。

## 存档与行为

收藏、最近游玩和主题保存在当前浏览器的 localStorage。清除网站数据会清除这些记录。不同设备和不同域名的记录独立。

返回大厅会保留离开时的筛选条件和滚动位置。2048 重新进入或刷新时会恢复棋盘和分数，点击“新一局”或“重新开始”会清空本局。打砖块自动保存关卡起点和入关分数，刷新后重开已保存关卡；每关恢复 3 条生命，失败可重试本关，“新一局”从第 1 关开始。贪吃蛇和 Rooftop Reset 重新进入或刷新会开始新的一局。Rooftop Reset 的楼层检查点只对本局有效。所有最佳成绩保存在当前浏览器；清除网站数据也会删除这些存档。

为适配大厅内嵌游玩，Rooftop Reset 通关后显示站内完成提示，提供“打开 ChatGPT”“再玩一次”“返回大厅”。ChatGPT 链接由玩家主动点击并在新标签页打开。直接访问游戏独立入口时，仍采用原游戏的通关跳转流程。

## 文件说明

- `index.html`、`lobby.js` — 游戏大厅与筛选。
- `play.html`、`player.js` — 游玩页、全屏和操作说明。
- `common.js` — 清单读取、收藏、最近记录、主题和通用 UI。
- `styles.css` — 大厅与游玩页样式，包含响应式布局。
- `games.json` — 可编辑的游戏清单。
- `stats.js`、`server/stats_server.py` — 访问统计组件与持久化接口。
- `deploy/` — Hermes 部署交接、systemd 服务和 Nginx 代理配置。
- `tests/test_stats.py` — 统计服务回归测试。
- `assets/` — 大厅图标、封面及标题图。
- `games/rooftop-reset/` — Rooftop Reset 的游戏前端和素材。
- `games/2048/`、`games/snake/`、`games/breakout/` — 新增游戏，每款的 `logic.js` 管理规则，`game.js` 管理画面和交互。
- `games/shared/` — 新增游戏的统一界面、存档、暂停、触屏操作和样式。

Rooftop Reset 的游戏前端和美术来自 2026 年 11 月 7 日的 https://www.poteto.com/ 公开页面，原作品归各自作者所有。此项目在原游戏上增加了与大厅通信的适配。

打砖块的 50 关由 `games/breakout/levels.js` 配置：球速从 270 逐关升至 417，挡板宽度从 104 缩至 65，砖阵从 6 行增加到 10 行。第 16 关起有双层砖，第 31 关起有三层砖。全部砖块初始就在屏幕内；清空任意整行后，所有剩余砖块下移一行（20 像素），即使连续清行也不会移出屏幕，球在 0.22 秒下移动画期间暂停。
