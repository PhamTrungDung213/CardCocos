import { _decorator, sys } from 'cc';

export class SceneManager {
    private static readonly NEXT_SCENE_KEY = "NEXT_GAME_LEVEL_NAME";

    public static setNextScene(sceneName: string) {
        sys.localStorage.setItem(this.NEXT_SCENE_KEY, sceneName);
    }

    public static getNextScene(): string {
        return sys.localStorage.getItem(this.NEXT_SCENE_KEY) || "";
    }
}