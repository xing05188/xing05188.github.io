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

// 星空背景
(function() {
  const canvas = document.createElement('canvas');
  canvas.id = 'star-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let width, height;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  resize();
  window.addEventListener('resize', resize);

  const STAR_NUM = 150;
  const stars = [];
  for (let i = 0; i < STAR_NUM; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 0.8 + 0.2,
      o: Math.random() * 0.5 + 0.5,
      speed: 0.02 + Math.random() * 0.03
    });
  }
  function drawStars() {
    ctx.clearRect(0,0,width,height);
    for(let star of stars) {
      ctx.save();
      ctx.globalAlpha = star.o;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, 2 * Math.PI);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
      star.x += star.speed;
      if(star.x > width) {
        star.x = 0;
        star.y = Math.random() * height;
      }
    }
    requestAnimationFrame(drawStars);
  }
  drawStars();
})();

// 粒子环绕鼠标
(function() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let width = window.innerWidth;
  let height = window.innerHeight;
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  resize();
  window.addEventListener('resize', resize);

  let mouse = { x: width/2, y: height/2 };
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  const PARTICLE_NUM = 18;
  let angleOffset = 0;
  let particleRadius = 68;
  function drawParticles() {
    ctx.clearRect(0,0,width,height);
    angleOffset += 0.02;
    for(let i=0;i<PARTICLE_NUM;i++){
      const angle = angleOffset + i * (2 * Math.PI / PARTICLE_NUM);
      const px = mouse.x + particleRadius * Math.cos(angle);
      const py = mouse.y + particleRadius * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, 2*Math.PI);
      ctx.fillStyle = `rgba(64,158,255,0.85)`;
      ctx.shadowColor = '#409eff';
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    requestAnimationFrame(drawParticles);
  }
  drawParticles();
})();

// 右侧笑脸，表情随鼠标动
(function() {
  const canvas = document.createElement('canvas');
  canvas.id = 'smile-face-canvas';
  canvas.width = 120;
  canvas.height = 120;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let width = canvas.width, height = canvas.height;

  let mouseX = 0.5, mouseY = 0.5;
  function updateMouse(e) {
    mouseX = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
    mouseY = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
  }
  window.addEventListener('mousemove', updateMouse);

  function drawFace() {
    ctx.clearRect(0,0,width,height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(width/2, height/2, 52, 0, 2*Math.PI);
    ctx.fillStyle = "#ffe066";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(width/2-24, height/2-10, 8, 0, 2*Math.PI);
    ctx.arc(width/2+24, height/2-10, 8, 0, 2*Math.PI);
    ctx.fillStyle = "#444";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    const smile = (mouseX-0.5)*40;
    const smileH = 26 + (mouseY-0.5)*18;
    ctx.moveTo(width/2-24, height/2+22);
    ctx.bezierCurveTo(
      width/2-12, height/2+smileH+smile/5,
      width/2+12, height/2+smileH-smile/5,
      width/2+24, height/2+22
    );
    ctx.stroke();
    ctx.restore();
  }

  function loop() {
    drawFace();
    requestAnimationFrame(loop);
  }
  loop();
})();
