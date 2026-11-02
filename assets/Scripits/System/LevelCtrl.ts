import { _decorator, Component, director, CCString, Node } from 'cc';
import { SceneManager } from '../SceneLoad/SceneManager';
const { ccclass, property } = _decorator;

@ccclass('LevelCtrl')
export class LevelCtrl extends Component {

    public static instance: LevelCtrl = null;
    private _isLevelPause: boolean = false;

    @property({ type: CCString })
    public loadSceneName: string;

    onLoad() {
        if (LevelCtrl.instance === null) {
            LevelCtrl.instance = this;
        } else {
            this.destroy();
            return;
        }
        director.on("PAUSE_LEVEL", this.onPauseGame, this);
        director.on("RESUME_LEVEL", this.onResumeGame, this);
    }

    onDestroy() {
        director.off('PAUSE_LEVEL', this.onPauseGame, this);
        director.off('RESUME_LEVEL', this.onResumeGame, this);
        // Đảm bảo game không bị kẹt ở trạng thái pause khi chuyển sang Scene khác
        director.resume();

        if (LevelCtrl.instance === this) {
            LevelCtrl.instance = null;
        }
    }

    private onPauseGame(): void {
        this._isLevelPause = true;
        console.log("LevelCtrl: Đã nhận tín hiệu PAUSE -> Dừng game");
        director.pause();
    }

    private onResumeGame(): void {
        this._isLevelPause = false;
        console.log("LevelCtrl: Đã nhận tín hiệu RESUME -> Tiếp tục game");
        director.resume();
    }

    public isLevelPause() {
        return this._isLevelPause;
    }

    public goToScene(targetSceneName: string): void {
        if (!targetSceneName) {
            console.error("Tên Scene mục tiêu không hợp lệ!");
            return;
        }
        director.resume();
        SceneManager.setNextScene(targetSceneName);
        director.loadScene(this.loadSceneName);
    }

    public onButtonClick(event: any, customEventData: string): void {
        this.goToScene(customEventData);
    }
}