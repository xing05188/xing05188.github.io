---
layout: post
title: "Python 异步编程：搞懂 await 到底在等什么"
date: 2026-09-04 20:05:00 +0800
categories: [技术]
tags: [Python, 异步]
description: "async/await 不难，难的是理解它为什么不快 —— 以及什么时候根本不该用它。"
---

我第一次写异步代码的时候，把几个函数前面加上 `async`，调用处加上 `await`，
运行，发现**比同步版本还慢**。当时完全不理解为什么。

后来才搞明白：异步不是"让代码跑得更快"，而是"让等待不阻塞别人"。

## 核心：await 是在让出控制权

看这段代码：

```python
import asyncio
import time

async def fetch(name, delay):
    print(f"{name} 开始")
    await asyncio.sleep(delay)   # 让出控制权
    print(f"{name} 结束")
    return name

async def main():
    start = time.perf_counter()
    result = await asyncio.gather(
        fetch("A", 1),
        fetch("B", 1),
        fetch("C", 1),
    )
    print(f"耗时 {time.perf_counter() - start:.2f}s")
    return result

asyncio.run(main())
```

三个任务各等 1 秒，总共只花 **1 秒**，不是 3 秒。

关键在 `await asyncio.sleep(1)` 这一行。执行到这里时，
当前协程说"我要等 1 秒，这段时间我不需要 CPU，让别人用吧"，
然后把控制权交还给事件循环。事件循环就去跑别的协程。

**所以 `await` 的意思是"我在等，你可以先干别的"**，不是"我在这里阻塞等待"。

## 一个最常见的坑：忘了 await

```python
async def main():
    fetch("A", 1)        # ❌ 什么都不会发生
    asyncio.create_task(fetch("A", 1))   # ✅ 排进事件循环

    await fetch("A", 1)  # ✅ 立刻执行并等待结果
```

直接调用一个协程函数**不会执行它**，只会创建一个协程对象然后丢掉。
Python 会给你一个 `RuntimeWarning: coroutine was never awaited`，很容易被忽略。

## 真正让它变慢的原因：阻塞了事件循环

这是当初让我"越异步越慢"的元凶：

```python
async def bad():
    time.sleep(1)        # ❌ 同步阻塞，整个事件循环卡死
    requests.get(url)    # ❌ 同样阻塞

async def good():
    await asyncio.sleep(1)          # ✅
    await aiohttp_session.get(url)  # ✅ 用支持异步的库
```

事件循环是**单线程**的。任何一个地方用了同步阻塞调用，
整个循环就卡在那里，所有其他协程都得等着 —— 异步彻底失效。

判断标准很简单：**凡是涉及 I/O 的库，都必须换成异步版本。**

| 同步 | 异步 |
| --- | --- |
| `requests` | `aiohttp` / `httpx` |
| `pymysql` / `psycopg2` | `aiomysql` / `asyncpg` |
| `open()` 读文件 | `aiofiles` |
| `redis` | `redis.asyncio` |
| `time.sleep()` | `asyncio.sleep()` |

## gather 还是 create_task

```python
# 方式一：gather —— 批量跑，按传入顺序返回结果
results = await asyncio.gather(fetch(a), fetch(b), fetch(c))

# 方式二：create_task —— 细粒度控制，可以单独取消
task = asyncio.create_task(fetch(a))
# ... 做点别的
task.cancel()          # 可以取消
result = await task
```

简单场景下两者等价。需要**超时控制**、**取消**、或者任务数量动态变化时，用 `create_task`。

超时写法：

```python
try:
    result = await asyncio.wait_for(fetch("A", 5), timeout=2.0)
except asyncio.TimeoutError:
    print("超时了")
```

## CPU 密集任务：别用异步

这是另一个常见误解。异步解决的是**等待 I/O** 的问题，
对**占用 CPU 计算**没有任何帮助 —— 因为 CPU 一直在忙，没有"让出"的必要。

```python
# ❌ 异步对纯计算没有意义
async def compute():
    return sum(i * i for i in range(10**8))

# ✅ CPU 密集用多进程
from concurrent.futures import ProcessPoolExecutor

def compute():
    return sum(i * i for i in range(10**8))

with ProcessPoolExecutor() as pool:
    result = await loop.run_in_executor(pool, compute)
```

一句话总结分工：

> **I/O 密集 → asyncio；CPU 密集 → multiprocessing。**

## 我的判断流程

现在决定要不要上异步，我会问自己三个问题：

1. **瓶颈是等待还是计算？** 如果只是等网络、等数据库，异步有用；如果是算，没用
2. **整个调用链都能异步吗？** 只要中间有一处是同步阻塞的，收益就大打折扣
3. **同步写法够不够用？** 很多时候开几个线程就够了，异步带来的复杂度未必划算

异步的代价是**传染性** —— 一个函数变成 `async`，所有调用它的函数都得变成 `async`。
这个成本在大型项目里很实在，不要为了"看起来高级"而引入。
