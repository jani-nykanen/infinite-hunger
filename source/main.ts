import { Game } from "./game.js";

window.onload = () : void => (new Game(new AudioContext())).run();
