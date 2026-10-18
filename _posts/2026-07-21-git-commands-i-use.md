---
layout: post
title: "我真正常用的 Git 命令，其实只有十几个"
date: 2026-07-21 15:20:00 +0800
categories: [技术]
tags: [Git, 工具]
description: "Git 有两百多个命令，但我 95% 的时间只用到十几个。按场景整理一遍。"
---

Git 的手册有几百页，命令有一两百个。但我回头翻了下自己的 shell history，
发现 95% 的时间只用到十几个命令。

下面按场景整理，都是真正常用的，不是那种"炫技但一年用一次"的。

## 提交之前：看清自己改了什么

```bash
git status -s          # 简短状态
git diff               # 工作区 vs 暂存区
git diff --staged      # 暂存区 vs HEAD
```

`git diff` 不带参数只看未暂存的改动 —— 很多人 `git add .` 之后发现 diff 是空的，
以为改动丢了，其实是没加 `--staged`。

**最值得养成的习惯是 `git add -p`**：

```bash
git add -p src/main.py
```

它会把改动切成一块一块，逐个问你要不要暂存。
好处是逼你在提交前重新看一遍每一处改动，顺便把"调试用的 print"和"真正的修改"分开提交。

## 提交之后：改错了怎么办

这一块是我用得最频繁的。

```bash
# 只改提交信息
git commit --amend -m "新的信息"

# 改漏了文件，补进上一个提交
git add forgotten.py
git commit --amend --no-edit
```

> ⚠️ `--amend` 会重写历史。如果这个提交已经 push 出去并且别人拉过，别这么干。

撤销工作区的修改：

```bash
git restore <file>            # 丢弃工作区改动（Git 2.23+）
git restore --staged <file>   # 取消暂存，改动还在
git checkout -- <file>        # 老写法，效果同上
```

想撤掉一个已经提交的改动，但保留历史记录：

```bash
git revert <commit>   # 生成一个"反向"的新提交
```

这是**团队协作里唯一安全的方式** —— 它不重写历史，别人拉代码不会出问题。

## 临时切换：stash

写到一半要切分支，但又不想提交半成品：

```bash
git stash push -m "做到一半的登录页"
git stash list                 # 看看存了哪些
git stash pop                  # 取回最近一个并删除
git stash apply stash@{1}      # 取回指定的，但保留在列表里
```

小提示：stash 默认不管未跟踪的新文件。新文件也要存的话加 `-u`。

## 看历史：找东西比记命令重要

```bash
git log --oneline --graph --all -20    # 图形化看分支和合并
git log -S "函数名"                     # 搜哪次提交引入/删除了某个字符串
git log -- path/to/file                # 只看某个文件的历史
git show <commit>                      # 看某次提交改了什么
git blame <file> -L 20,30              # 谁改了第 20-30 行
```

`-S` 这个功能被严重低估。想知道"这个字段是什么时候加进来的"，
`git log -S` 比翻 PR 快得多。

## 二分找 bug

有个 bug，确定上周是好的，今天是坏的，中间有 30 个提交。
一个一个试太慢，用 `git bisect`：

```bash
git bisect start
git bisect bad              # 当前版本有问题
git bisect good <老commit>  # 这个版本是好的
# Git 会自动切到中间的提交，你测试完告诉它：
git bisect good   # 或 git bisect bad
# 重复几次，它会告诉你第一个坏掉的提交
git bisect reset  # 结束
```

30 个提交只需要测 5 次左右。第一次用会觉得像魔术。

## 救命：reflog

**如果只能记住一个 Git 命令，记这个。**

```bash
git reflog
```

它记录了 HEAD 的每一次移动 —— 包括被 reset 掉、被 rebase 覆盖掉的提交。
只要那个提交曾经存在过，reflog 里就有它的 hash。

```bash
git reflog
# 找到误删的提交 hash，比如 3a7f2c1
git checkout 3a7f2c1        # 先确认是不是它
git cherry-pick 3a7f2c1     # 拿回来
```

我有次 `git reset --hard` 把两天的活儿删了，靠 reflog 全捡回来。
从那以后我再也不怕在 Git 里"搞砸"了 —— 只要提交过，就找得回来。

## 最后

Git 的心智模型其实就一句话：**它是个内容寻址的数据库，commit 是不可变的快照，分支只是个指针。**

理解这句话之后，那些五花八门的命令就不需要背了 ——
你只需要知道"我想把这个指针移到哪里"，然后去查对应的命令就行。
