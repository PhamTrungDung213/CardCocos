import { _decorator, Component, Node, Button, RichText, director, tween, Tween, Vec3 } from 'cc';
import { EventBus, GameEvent } from '../Events/GameEvents';
import { LevelCtrl } from './LevelCtrl';
const { ccclass, property } = _decorator;

@ccclass('ResultSys')
export class ResultSys extends Component {
    public static instance: ResultSys | null = null;

    @property({ type: Node, tooltip: 'Kéo node ResultOpt (hoặc ResultSys) vào đây' })
    public resultPopup: Node = null!;

    @property({ type: RichText, tooltip: 'Kéo node ResultLabael (có RichText) vào đây' })
    public resultRichText: RichText = null!;

    @property({ type: Button, tooltip: 'Kéo node Next (có Button) vào đây' })
    public nextBtn: Button = null!;

    @property({ type: Button, tooltip: 'Kéo node Menu (có Button) vào đây' })
    public menuBtn: Button = null!;

    @property({ type: Button, tooltip: 'Kéo node Reset (có Button) vào đây' })
    public resetBtn: Button = null!;

    onLoad() {
        ResultSys.instance = this;

        // Đăng ký sự kiện nút bấm
        if (this.nextBtn?.node) {
            this.nextBtn.node.on(Button.EventType.CLICK, this.onNextButtonClicked, this);
        }
        if (this.menuBtn?.node) {
            this.menuBtn.node.on(Button.EventType.CLICK, this.onMenuButtonClicked, this);
        }
        if (this.resetBtn?.node) {
            this.resetBtn.node.on(Button.EventType.CLICK, this.onResetButtonClicked, this);
        }

        // Lắng nghe sự kiện Thắng / Thua qua Observer Pattern
        EventBus.on(GameEvent.VICTORY, this.onVictory, this);
        EventBus.on(GameEvent.GAME_OVER, this.onGameOver, this);

        // Ban đầu chỉ ẩn panel ResultOpt, GIỮ NODE ResultSys LUÔN ACTIVE
        this.hideResult();
    }

    onDestroy() {
        EventBus.off(GameEvent.VICTORY, this.onVictory, this);
        EventBus.off(GameEvent.GAME_OVER, this.onGameOver, this);

        if (this.nextBtn?.node) this.nextBtn.node.off(Button.EventType.CLICK, this.onNextButtonClicked, this);
        if (this.menuBtn?.node) this.menuBtn.node.off(Button.EventType.CLICK, this.onMenuButtonClicked, this);
        if (this.resetBtn?.node) this.resetBtn.node.off(Button.EventType.CLICK, this.onResetButtonClicked, this);

        if (ResultSys.instance === this) {
            ResultSys.instance = null;
        }
    }

    /**
     * Ẩn panel hiển thị kết quả (giữ node gốc ResultSys luôn active để đón nhận sự kiện)
     */
    public hideResult(): void {
        if (this.resultPopup && this.resultPopup !== this.node) {
            this.resultPopup.active = false;
        }
        const opt = this.node.getChildByName('ResultOpt');
        if (opt) {
            opt.active = false;
        }
    }

    // =========================================================================
    // XỬ LÝ TRẠNG THÁI VICTORY (THẮNG) & GAME_OVER (THUA)
    // =========================================================================

    public onVictory(): void {
        console.log('[ResultSys] === KÍCH HOẠT MÀN HÌNH CHIẾN THẮNG (VICTORY)! ===');
        this.showResultPanel(true);
    }

    public onGameOver(): void {
        console.log('[ResultSys] === KÍCH HOẠT MÀN HÌNH THẤT BẠI (DEFEAT)! ===');
        this.showResultPanel(false);
    }

    private showResultPanel(isWin: boolean): void {
        this.node.active = true;

        // Bật panel ResultOpt
        if (this.resultPopup && this.resultPopup !== this.node) {
            this.resultPopup.active = true;
        }
        const opt = this.node.getChildByName('ResultOpt');
        if (opt) {
            opt.active = true;
        }

        // Cập nhật text hiển thị
        const winRichText = `<color=#2ecc71><b>VICTORY</b></color>`;
        const loseRichText = `<color=#e74c3c><b>DEFEAT</b></color>`;

        const rich = this.resultRichText || (opt ? opt.getComponentInChildren(RichText) : this.node.getComponentInChildren(RichText));
        if (rich) {
            rich.string = isWin ? winRichText : loseRichText;
        }

        // Thắng -> Hiện nút Next; Thua -> Ẩn nút Next (chỉ cho Reset hoặc Menu)
        if (this.nextBtn?.node) {
            this.nextBtn.node.active = isWin;
        }
        if (this.resetBtn?.node) {
            this.resetBtn.node.active = true;
        }
        if (this.menuBtn?.node) {
            this.menuBtn.node.active = true;
        }

        // Hiệu ứng Pop-up nảy ra mượt mà
        const animTarget = (this.resultPopup && this.resultPopup !== this.node) ? this.resultPopup : opt;
        if (animTarget) {
            Tween.stopAllByTarget(animTarget);
            animTarget.setScale(new Vec3(0.6, 0.6, 1));
            tween(animTarget)
                .to(0.35, { scale: Vec3.ONE }, { easing: 'backOut' })
                .start();
        }
    }

    // =========================================================================
    // SỰ KIỆN NÚT BẤM (BUTTON HANDLERS)
    // =========================================================================

    public onNextButtonClicked(): void {
        console.log('[ResultSys] Bấm NEXT: Tải lại hoặc qua màn kế tiếp!');
        director.resume();

        const currentSceneName = director.getScene()?.name || 'Game_Level';
        if (LevelCtrl.instance && LevelCtrl.instance.loadSceneName) {
            LevelCtrl.instance.goToScene(currentSceneName);
        } else {
            director.loadScene(currentSceneName);
        }
    }

    public onResetButtonClicked(): void {
        console.log('[ResultSys] Bấm RESET: Tải lại trận đấu!');
        director.resume();

        const currentSceneName = director.getScene()?.name || 'Game_Level';
        if (LevelCtrl.instance && LevelCtrl.instance.loadSceneName) {
            LevelCtrl.instance.goToScene(currentSceneName);
        } else {
            director.loadScene(currentSceneName);
        }
    }

    public onMenuButtonClicked(): void {
        console.log('[ResultSys] Bấm MENU: Quay về màn hình Menu chính!');
        director.resume();

        if (LevelCtrl.instance && LevelCtrl.instance.loadSceneName) {
            LevelCtrl.instance.goToScene('Menu');
        } else {
            director.loadScene('Menu');
        }
    }
}
