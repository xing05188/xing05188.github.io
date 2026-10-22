---
layout: null
---
/* 全站文章速查索引（构建时生成，供“随便看看”与命令面板使用） */
window.STAR_POSTS = [
  {% for post in site.posts %}
  {
    "title": {{ post.title | jsonify }},
    "url": {{ post.url | relative_url | jsonify }},
    "date": {{ post.date | date: "%Y-%m-%d" | jsonify }},
    "cat": {{ post.categories.first | default: "" | jsonify }},
    "tags": {{ post.tags | jsonify }}
  }{% unless forloop.last %},{% endunless %}
  {% endfor %}
];
