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
  // 生成星星
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
      // 星星缓慢移动
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

  // 环绕粒子
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

  // 鼠标位置归一化(-1~1)，决定嘴角弯曲
  let mouseX = 0.5, mouseY = 0.5;
  function updateMouse(e) {
    mouseX = Math.max(0, Math.min(1, e.clientX / window.innerWidth));
    mouseY = Math.max(0, Math.min(1, e.clientY / window.innerHeight));
  }
  window.addEventListener('mousemove', updateMouse);

  function drawFace() {
    ctx.clearRect(0,0,width,height);
    // 脸
    ctx.save();
    ctx.beginPath();
    ctx.arc(width/2, height/2, 52, 0, 2*Math.PI);
    ctx.fillStyle = "#ffe066";
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    // 眼睛
    ctx.save();
    ctx.beginPath();
    ctx.arc(width/2-24, height/2-10, 8, 0, 2*Math.PI);
    ctx.arc(width/2+24, height/2-10, 8, 0, 2*Math.PI);
    ctx.fillStyle = "#444";
    ctx.fill();
    ctx.restore();

    // 嘴巴（根据鼠标改变）
    ctx.save();
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    // 嘴巴弧度：中间跟随mouseX, 笑高跟随mouseY
    const smile = (mouseX-0.5)*40; // 左右嘴角
    const smileH = 26 + (mouseY-0.5)*18; // 嘴高
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