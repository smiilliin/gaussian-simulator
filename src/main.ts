import * as PIXI from "pixi.js";

const app = new PIXI.Application({
  background: "#000000",
  resizeTo: window,
});

document.body.appendChild(app.view as HTMLCanvasElement);

app.stage.eventMode = "static";
app.stage.hitArea = app.screen;

const view = new PIXI.Container();

app.stage.addChild(view);

class Vector2 {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  clone() {
    return new Vector2(this.x, this.y);
  }
}
const g = 120;
let N: number;

class Ball extends PIXI.Graphics {
  velocity: Vector2;
  blockVector: Vector2;
  end: boolean;

  static radius = 5;
  constructor() {
    super();
    this.beginFill(0xbbbbbb);
    this.drawCircle(0, 0, Ball.radius);
    this.endFill();

    this.end = false;
    this.blockVector = new Vector2(0, -1);
    this.velocity = new Vector2(0, 0);
  }
  tick(ms: number, blocksSize: Vector2, finalBalls: Map<number, Ball[]>) {
    const newBlockVector = Block.fromVector(
      new Vector2(this.x, this.y + Ball.radius + Block.radius)
    );

    if (this.end) return;

    if (this.y < app.screen.height * 0.9) {
      this.velocity.y += g * (ms / 1000);
      this.x += this.velocity.x * (ms / 1000) * 10;
      this.y += this.velocity.y * (ms / 1000) * 10;
    } else {
      this.end = true;
      let x = this.blockVector.x;
      if (this.velocity.x > 0) {
        x = this.blockVector.x + 1;
      } else {
        x = this.blockVector.x - 1;
      }
      this.x = Block.toVector(x, 0).x;

      const balls = finalBalls.get(x);
      this.y = app.screen.height * 0.9;

      if (!balls) {
        finalBalls.set(x, [this]);
      } else {
        this.y -= balls.length * Ball.radius * 2;
        balls.push(this);
      }
    }

    if (
      this.blockVector.y < blocksSize.y - 1 &&
      this.blockVector.y < Math.floor(newBlockVector.y)
    ) {
      this.blockVector.x = Math.round(newBlockVector.x);
      this.x = Block.toVector(this.blockVector.x, 0).x;
      this.blockVector.y = Math.floor(newBlockVector.y);
      this.velocity.y = -Math.sqrt((2 * g * (Block.gapY / 10)) / 2);

      const finalVelocity = Math.sqrt(2 * g * ((Block.gapY / 10) * (3 / 2)));
      const t = (finalVelocity - this.velocity.y) / g;
      this.velocity.x = (Math.random() < 0.5 ? -1 : 1) * (Block.gapX / 10 / t);
    }
  }
}
class Block extends PIXI.Graphics {
  unitX: number;
  unitY: number;

  static gapX = 20;
  static gapY = 20;
  static radius = 4;

  static toVector(unitX: number, unitY: number) {
    return new Vector2(
      app.screen.width / 2 + unitX * Block.gapX,
      unitY * Block.gapY + app.screen.height * 0.1
    );
  }
  static fromVector(vector: Vector2) {
    const y = (vector.y - app.screen.height * 0.1) / Block.gapY;
    return new Vector2(
      (vector.x - app.screen.width / 2) / Block.gapX,
      y < -1 ? -1 : y
    );
  }

  constructor(unitX: number, unitY: number) {
    super();
    this.beginFill(0xbbbbbb, 0.2);
    this.drawCircle(0, 0, Block.radius);
    this.endFill();

    this.unitX = unitX;
    this.unitY = unitY;

    const vector = Block.toVector(unitX, unitY);
    this.x = vector.x;
    this.y = vector.y;
  }
}

const blocks: Block[] = [];
let blocksSize: Vector2;

const balls: Ball[] = [];
const finalBalls: Map<number, Ball[]> = new Map();

let dist: number;

let done = false;

const start = () => {
  balls.forEach((ball) => view.removeChild(ball));
  blocks.forEach((block) => view.removeChild(block));
  balls.splice(0);
  blocks.splice(0);
  finalBalls.clear();
  done = false;

  N = Math.floor(
    Math.tanh(app.screen.height / 2000 + Math.random() / 100) * 800
  );

  blocksSize = new Vector2(
    Math.floor(((app.screen.width / 2) * 0.8) / Block.gapX),
    Math.floor((app.screen.height * 0.7) / Block.gapY)
  );

  dist = Math.sqrt((1 / 4) * blocksSize.y);
  for (let x = -blocksSize.x; x <= blocksSize.x; x++) {
    for (let y = 0; y < blocksSize.y; y++) {
      const block = new Block(x, y);
      view.addChild(block);
      blocks.push(block);
    }
  }

  for (let i = 0; i < N; i++) {
    const ball = new Ball();
    ball.x = app.screen.width / 2;
    ball.y = Math.random() * 50 - 50;
    view.addChild(ball);
    balls.push(ball);
  }
};
start();

const f = (x: number) =>
  (1 / (dist * Math.sqrt(2 * Math.PI))) *
  Math.exp((-x * x) / (2 * dist * dist));
const dx = 0.001;
const p = (a: number, b: number) => {
  let result = 0;
  while (a <= b) {
    result += f(a) * dx;
    a += dx;
  }
  return result;
};

const graph = new PIXI.Graphics();

let prevX: number;
let prevY: number;
let lastDrawTime = Date.now();
let x = 0;

const draw = () => {
  graph.clear();

  graph.lineStyle(3, 0x777777, 0.8);

  prevX = app.screen.width / 2 + -blocksSize.x * Block.gapX;
  prevY = app.screen.height * 0.9 + Block.radius;
  graph.moveTo(prevX, prevY);
  lastDrawTime = Date.now();
  x = -blocksSize.x;
};

const drawStep = () => {
  if (Date.now() - lastDrawTime < 5) return;
  if (x > blocksSize.x) return;

  graph.moveTo(prevX, prevY);

  const newX = app.screen.width / 2 + x * Block.gapX;
  const newY =
    app.screen.height * 0.9 +
    Block.radius -
    p(-1 / 2 + x, 1 / 2 + x) * N * Ball.radius * 2;
  graph.lineTo(newX, newY);

  prevX = newX;
  prevY = newY;

  x += 0.5;

  if (x <= blocksSize.x) {
    lastDrawTime = Date.now();
  } else {
    setTimeout(() => {
      graph.clear();
      start();
    }, 3000);
  }
};

view.addChild(graph);

let lastTime = Date.now();
app.ticker.add(() => {
  const currentTime = Date.now();
  let ms = currentTime - lastTime;
  if (ms > 1000 / 30) ms = 1000 / 30;

  let end = 0;
  balls.forEach((ball) => {
    ball.tick(ms, blocksSize, finalBalls);
    if (ball.end) end++;
  });
  lastTime = currentTime;

  if (!done && end == balls.length) {
    draw();
    done = true;
  } else if (done) {
    drawStep();
  }
});
