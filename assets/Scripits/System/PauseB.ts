import { _decorator, Component, director, Node } from 'cc';
import { LevelCtrl } from './LevelCtrl';
const { ccclass, property } = _decorator;

@ccclass('PauseB')
export class PauseB extends Component {
    @property({ type: Node })
    public pausePopup: Node = null;

    onLoad() {
        if (this.pausePopup) {
            this.pausePopup.active = false;
        }
    }

    public onPauseBClicked() {
        if (LevelCtrl.instance.isLevelPause()) {
            this.pausePopup.active = false;
            director.emit("RESUME_LEVEL");
        }
        else {
            this.pausePopup.active = true;
            director.emit("PAUSE_LEVEL");
        }
    }
}