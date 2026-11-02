import { _decorator, Component } from 'cc';
import { EventBus, GameEvent } from '../Events/GameEvents';
import { CardManager } from '../Card/CardManager';
import { EnemyManager } from '../Enemies/EnemyManager';
import { PlayerManager } from '../Card/PlayerManager';
import { ResultSys } from './ResultSys';
const { ccclass, property } = _decorator;

/**
 * State Pattern: Máy trạng thái hữu hạn (FSM) quản lý toàn bộ vòng lặp lượt chơi (Turn Cycle)
 */
export enum BattleState {
    SETUP = 'SETUP',                               // Khởi tạo màn chơi, wave quái
    PLAYER_DRAW = 'PLAYER_DRAW',                   // Rút bài đầu hiệp và hồi Mana
    PLAYER_TURN = 'PLAYER_TURN',                   // Lượt người chơi xếp bài vào slot, discard lấy mana, end turn
    RESOLVE_PLAYER_CARDS = 'RESOLVE_PLAYER_CARDS', // Khóa kéo thả, kích hoạt bài Slot 1 -> 2 -> 3
    ENEMY_TURN = 'ENEMY_TURN',                     // Lượt quái vật tấn công
    CHECK_RESULT = 'CHECK_RESULT',                 // Kiểm tra thắng/thua
    VICTORY = 'VICTORY',                           // Chiến thắng
    GAME_OVER = 'GAME_OVER',                       // Thất bại
}

@ccclass('LevelState')
export class LevelState extends Component {
    public static instance: LevelState | null = null;

    @property({ tooltip: 'Số lá bài rút mỗi hiệp từ hiệp 2 trở đi (luôn cố định đúng 1 lá)' })
    public cardsPerRound: number = 1;

    @property({ type: ResultSys, tooltip: 'Kéo node ResultSys vào đây (Tùy chọn)' })
    public resultSys: ResultSys | null = null;

    private _currentState: BattleState = BattleState.SETUP;
    private _roundNumber: number = 0;

    public get currentState(): BattleState {
        return this._currentState;
    }

    public get roundNumber(): number {
        return this._roundNumber;
    }

    public isPlayerTurn(): boolean {
        return this._currentState === BattleState.PLAYER_TURN;
    }

    onLoad() {
        LevelState.instance = this;

        // Đăng ký các sự kiện qua Observer Pattern
        EventBus.on(GameEvent.END_TURN_CLICKED, this.onEndTurnClicked, this);
        EventBus.on(GameEvent.ALL_ENEMIES_DEFEATED, this.onAllEnemiesDefeated, this);
        EventBus.on(GameEvent.PLAYER_DIED, this.onPlayerDied, this);
    }

    onDestroy() {
        EventBus.off(GameEvent.END_TURN_CLICKED, this.onEndTurnClicked, this);
        EventBus.off(GameEvent.ALL_ENEMIES_DEFEATED, this.onAllEnemiesDefeated, this);
        EventBus.off(GameEvent.PLAYER_DIED, this.onPlayerDied, this);

        if (LevelState.instance === this) {
            LevelState.instance = null;
        }
    }

    start() {
        // Đảm bảo node ResultSys được kích hoạt để sẵn sàng hiển thị khi thắng/thua
        const resNode = this.resultSys?.node || this.node.scene?.getChildByPath('Canvas/UI/ResultSys');
        if (resNode) {
            resNode.active = true;
        }

        this.transitionTo(BattleState.SETUP);
    }

    /**
     * Chuyển đổi trạng thái trung tâm của trận đấu (State Machine)
     */
    public transitionTo(newState: BattleState): void {
        // Nếu trận đấu đã kết thúc (chiến thắng hoặc thất bại) thì KHÔNG BAO GIỜ chuyển state nữa
        if (this._currentState === BattleState.VICTORY || this._currentState === BattleState.GAME_OVER) {
            console.warn(`[LevelState] Trận đấu đã kết thúc (${this._currentState}), bỏ qua chuyển sang ${newState}`);
            return;
        }

        const oldState = this._currentState;
        this._currentState = newState;
        console.log(`[LevelState] State: ${oldState} -> ${newState}`);

        // Bắn thông báo toàn hệ thống qua Observer EventBus
        EventBus.emit(GameEvent.GAME_STATE_CHANGED, { oldState, newState });

        // Xử lý logic khi vào State mới
        switch (newState) {
            case BattleState.SETUP:
                this.handleSetup();
                break;

            case BattleState.PLAYER_DRAW:
                this.handlePlayerDraw();
                break;

            case BattleState.PLAYER_TURN:
                this.handlePlayerTurn();
                break;

            case BattleState.RESOLVE_PLAYER_CARDS:
                this.handleResolvePlayerCards();
                break;

            case BattleState.ENEMY_TURN:
                this.handleEnemyTurn();
                break;

            case BattleState.VICTORY:
                this.handleVictory();
                break;

            case BattleState.GAME_OVER:
                this.handleGameOver();
                break;
        }
    }

    // =========================================================================
    // XỬ LÝ CHI TIẾT TỪNG STATE
    // =========================================================================

    private handleSetup(): void {
        this._roundNumber = 0;
        this.scheduleOnce(() => {
            this.transitionTo(BattleState.PLAYER_DRAW);
        }, 0.5);
    }

    private handlePlayerDraw(): void {
        this._roundNumber++;
        console.log(`[LevelState] === BẮT ĐẦU HIỆP ${this._roundNumber} ===`);

        // Nạp lại Mana cho người chơi đầu hiệp (mặc định 3 Mana)
        PlayerManager.instance?.resetManaForTurn();

        EventBus.emit(GameEvent.ROUND_START, { round: this._roundNumber });

        // Hiệp 1: CardManager đã rút 5 lá bài ban đầu lúc start()
        // Từ hiệp 2 trở đi: Mỗi lượt sau chỉ được rút đúng 1 lá bài duy nhất!
        if (this._roundNumber > 1 && CardManager.instance) {
            console.log(`[LevelState] Hiệp ${this._roundNumber}: Rút đúng 1 lá bài về tay`);
            CardManager.instance.dealInitialHand(1);
        }

        // Chờ bài bay về tay xong thì trao quyền điều khiển cho người chơi
        this.scheduleOnce(() => {
            this.transitionTo(BattleState.PLAYER_TURN);
        }, 0.4);
    }

    private handlePlayerTurn(): void {
        console.log(`[LevelState] === LƯỢT NGƯỜI CHƠI (Hiệp ${this._roundNumber}) ===`);
    }

    private handleResolvePlayerCards(): void {
        console.log('[LevelState] === KÍCH HOẠT CHUỖI BÀI TRONG SLOT ===');
        EventBus.emit(GameEvent.SLOT_RESOLVE_START);

        if (!CardManager.instance) {
            this.transitionTo(BattleState.ENEMY_TURN);
            return;
        }

        // Kích hoạt tuần tự Slot 1 -> Slot 2 -> Slot 3
        CardManager.instance.executeSlotCards(() => {
            EventBus.emit(GameEvent.SLOT_RESOLVE_END);

            // Nếu đã kết thúc trận đấu trong khi bài kích hoạt thì dừng ngay
            if (this._currentState === BattleState.VICTORY || this._currentState === BattleState.GAME_OVER) {
                return;
            }

            // Kiểm tra xem quái đã chết hết chưa
            if (EnemyManager.instance && EnemyManager.instance.isAllEnemiesDead()) {
                this.transitionTo(BattleState.VICTORY);
            } else {
                this.transitionTo(BattleState.ENEMY_TURN);
            }
        });
    }

    private handleEnemyTurn(): void {
        console.log('[LevelState] === LƯỢT QUÁI VẬT TẤN CÔNG ===');
        EventBus.emit(GameEvent.ENEMY_TURN_START);

        if (!EnemyManager.instance) {
            this.transitionTo(BattleState.PLAYER_DRAW);
            return;
        }

        // Quái vật lần lượt tấn công người chơi
        EnemyManager.instance.executeEnemyTurn(() => {
            EventBus.emit(GameEvent.ENEMY_TURN_END);

            // Nếu đã Game Over trong khi quái đánh thì không sang Player Draw
            if (this._currentState === BattleState.GAME_OVER || this._currentState === BattleState.VICTORY) {
                return;
            }

            // Kiểm tra người chơi còn sống không
            if (PlayerManager.instance && !PlayerManager.instance.isAlive) {
                this.transitionTo(BattleState.GAME_OVER);
            } else {
                // Sang hiệp mới
                this.transitionTo(BattleState.PLAYER_DRAW);
            }
        });
    }

    private handleVictory(): void {
        console.log('[LevelState] *** CHIẾN THẮNG TRẬN ĐẤU! ***');
        EventBus.emit(GameEvent.VICTORY);

        const res = this.resultSys || ResultSys.instance || this.node.scene?.getChildByPath('Canvas/UI/ResultSys')?.getComponent(ResultSys);
        if (res) {
            res.node.active = true;
            res.onVictory();
        }
    }

    private handleGameOver(): void {
        console.log('[LevelState] *** NGƯỜI CHƠI BỊ TIÊU DIỆT - THẤT BẠI! ***');
        EventBus.emit(GameEvent.GAME_OVER);

        const res = this.resultSys || ResultSys.instance || this.node.scene?.getChildByPath('Canvas/UI/ResultSys')?.getComponent(ResultSys);
        if (res) {
            res.node.active = true;
            res.onGameOver();
        }
    }

    // =========================================================================
    // OBSERVER CALLBACKS
    // =========================================================================

    private onEndTurnClicked(): void {
        if (this._currentState === BattleState.PLAYER_TURN) {
            this.transitionTo(BattleState.RESOLVE_PLAYER_CARDS);
        }
    }

    private onAllEnemiesDefeated(): void {
        if (this._currentState !== BattleState.VICTORY && this._currentState !== BattleState.GAME_OVER) {
            this.transitionTo(BattleState.VICTORY);
        }
    }

    private onPlayerDied(): void {
        if (this._currentState !== BattleState.GAME_OVER && this._currentState !== BattleState.VICTORY) {
            this.transitionTo(BattleState.GAME_OVER);
        }
    }
}
