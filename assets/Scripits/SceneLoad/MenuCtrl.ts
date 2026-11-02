import { _decorator, CCString, Component, director, Node } from 'cc';
import { SceneManager } from './SceneManager';
const { ccclass, property } = _decorator;

@ccclass('MenuCtrl')
export class MenuCtrl extends Component {
    @property({ type: CCString })
    public loadSceneName: string;

    public onButtonClick(event: any, customEvenData: string): void {
        if (!customEvenData) {
            console.error("Nhap ten level muon tai!");
            return;
        }
        SceneManager.setNextScene(customEvenData);
        director.loadScene(this.loadSceneName);
    }
}