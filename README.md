# Infinite Hunger

A simple arcade game thingy made for [js13k](https://js13kgames.com/) 2025. [You can play it here](js13kgames.com/2025/games/infinite-hunger) 
(or you will be able to play it eventually).


## Compilation

Required tools:
- [Closure compiler](https://developers.google.com/closure/compiler)
- advzip
- git-lfs (needed to get access to the asset files)
- make


Supposing that you have Closure compiler installed to the folder `closure` (located in the root) 
and you have renamed the jar file to `closure.jar` (i.e. the full path is `closure/closure.jar`), you run

```
make js
make CLOSURE_PATH=./closure/closure.jar
```
and *boom*, you should have a file called `dist.zip`. 
 

-----

## License

- **Code**: MIT License
- **Assets** (i.e all .png files): CC BY-NC 4.0 DEED 

**Special conditions**: You are **NOT** allowed to use the code or the assets for the following:

- Training an AI.
- Any type of crypto or blockchain nonsense .
- Remove the author's name from the game and claiming that you made it.

-----


(c) 2025 Jani Nykänen
