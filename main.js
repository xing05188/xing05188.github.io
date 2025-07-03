
document.getElementById('toggle-dark').onclick = function () {
  document.body.classList.toggle('dark');
  if (document.body.classList.contains('dark')) {
    this.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    this.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
};
// 自动读取本地主题
window.onload = function () {
  if (localStorage.getItem('theme') === 'dark') {
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

document.addEventListener('mousemove', function (e) {
  const pupils = document.querySelectorAll('.pupil');
  pupils.forEach(pupil => {
    const eye = pupil.parentElement;
    const eyeRect = eye.getBoundingClientRect();
    const eyeX = eyeRect.left + eyeRect.width / 2;
    const eyeY = eyeRect.top + eyeRect.height / 2;
    const dx = e.clientX - eyeX;
    const dy = e.clientY - eyeY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = (eyeRect.width - pupil.offsetWidth) / 2.2;
    const moveX = (dx / distance) * Math.min(distance, maxDistance);
    const moveY = (dy / distance) * Math.min(distance, maxDistance);
    pupil.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
  const mouth = document.getElementById('mouth');
  const windowHeight = window.innerHeight;
  const normalizedY = e.clientY / windowHeight;
  const scale = 0.7 + normalizedY * 0.4;
  mouth.style.width = `${56 * scale}px`;
  mouth.style.height = `${24 * scale}px`;
});

