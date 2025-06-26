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
