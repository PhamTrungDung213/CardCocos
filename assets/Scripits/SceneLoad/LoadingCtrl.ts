import { _decorator, Component, Node, director, tween } from 'cc';
import { SceneManager } from './SceneManager';
const { ccclass, property } = _decorator;

@ccclass('LoadingCtrl')
export class LoadingCtrl extends Component {

    @property({ type: Node })
    public spinnerNode: Node = null!;

    start() {
        this.startSpinning();

        const levelName = SceneManager.getNextScene();
        if (levelName === "") {
            console.error("Khong co scene can load!")
            return;
        }

        this.startPreLoading(levelName);
    }

    private startPreLoading(sceneName: string): void {
        director.preloadScene(sceneName,
            (error: Error | null) => {
                if (error) {
                    console.error("Lỗi tải trước Scene:", error);
                    return;
                }
                console.log("Đã tải xong toàn bộ vào RAM!");
                director.loadScene(sceneName);
            }
        );
    }

    private startSpinning() {
        if (!this.spinnerNode) return;
        tween(this.spinnerNode)
            .by(1.0, { angle: -360 })
            .repeatForever()
            .start();
    }

}