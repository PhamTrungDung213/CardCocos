import { _decorator, Component, Button, Node } from 'cc';
import { EventBus, GameEvent } from '../Events/GameEvents';
import { BattleState } from '../System/LevelState';
const { ccclass, property } = _decorator;

/**
 * Điều khiển nút Kết thúc lượt (End Turn) qua Observer Pattern
 * - Lắng nghe thay đổi trạng thái trận đấu: chỉ bật khi đến lượt người chơi
 * - Bấm nút: phát sự kiện END_TURN_CLICKED cho LevelState xử lý
 */
@ccclass('EndTurnBtnCtrl')
export class EndTurnBtnCtrl extends Component {
    private _button: Button | null = null;

    onLoad() {
        this._button = this.getComponent(Button);

        // Lắng nghe sự kiện click của nút
        this.node.on(Button.EventType.CLICK, this.onButtonClick, this);

        // Đăng ký nhận thông báo thay đổi trạng thái trận đấu
        EventBus.on(GameEvent.GAME_STATE_CHANGED, this.onGameStateChanged, this);
    }

    onDestroy() {
        this.node.off(Button.EventType.CLICK, this.onButtonClick, this);
        EventBus.off(GameEvent.GAME_STATE_CHANGED, this.onGameStateChanged, this);
    }

    private onButtonClick(): void {
        if (this._button && !this._button.interactable) return;

        // Vô hiệu hóa nút ngay lập tức để tránh người chơi bấm liên thanh
        if (this._button) {
            this._button.interactable = false;
        }

        console.log('[EndTurnBtnCtrl] Người chơi bấm Kết thúc lượt!');
        EventBus.emit(GameEvent.END_TURN_CLICKED);
    }

    private onGameStateChanged(data: { oldState: BattleState; newState: BattleState }): void {
        if (!this._button) return;

        // Chỉ cho phép bấm nút khi đang ở lượt người chơi (PLAYER_TURN)
        const isPlayerTurn = (data.newState === BattleState.PLAYER_TURN);
        this._button.interactable = isPlayerTurn;
    }
}
