// 夜间模式切换
document.getElementById('toggle-dark').onclick = function() {
  document.body.classList.toggle('dark');
  if(document.body.classList.contains('dark')){
    this.textContent = '☀️';
    localStorage.setItem('theme','dark');
  } else {
    this.textContent = '🌙';
    localStorage.setItem('theme','light');
  }
};
// 自动读取本地主题
window.onload = function() {
  if(localStorage.getItem('theme') === 'dark'){
    document.body.classList.add('dark');
    document.getElementById('toggle-dark').textContent = '☀️';
  }
};
// 随机一句话
window.getQuote = function () {
  const quotes = [
    "人生如逆旅，我亦是行人。",
    "既然选择了远方，便只顾风雨兼程。",
    "路漫漫其修远兮，吾将上下而求索。",
    "Stay hungry. Stay foolish.",
    "你所热爱的，就是你的生活。"
  ];
  document.getElementById('quote').innerText = quotes[Math.floor(Math.random() * quotes.length)];
}

// 显示当前时间
window.showTime = function () {
  const now = new Date();
  document.getElementById('time').innerText = now.toLocaleString();
}
