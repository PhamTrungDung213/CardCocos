import { _decorator, Button, Component, director, Node } from 'cc';
import { LevelCtrl } from './LevelCtrl';
const { ccclass, property } = _decorator;

@ccclass('PauseSys')
export class PauseSys extends Component {
    @property({ type: Node })
    public pausePopup: Node = null;

    @property({ type: Button })
    public resumeB: Button = null;

    @property({ type: Button })
    public menuB: Button = null;

    @property({ type: Button })
    public resetB: Button = null;

    public onResumeButtonClicked() {
        if (LevelCtrl.instance.isLevelPause) {
            director.emit("RESUME_LEVEL")
            this.pausePopup.active = false;
        } else return;
    }

    public onMenuButtonClicked() {
        if (LevelCtrl.instance.isLevelPause) {
            director.emit("RESUME_LEVEL")
            LevelCtrl.instance?.onButtonClick(null, "Menu");
        } else return;
    }

    public onResetButtonClicked() {
        const currentSceneName = director.getScene()?.name;
        LevelCtrl.instance?.onButtonClick(null, currentSceneName);
    }
}