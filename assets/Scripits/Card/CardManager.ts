import { _decorator, Component, Node, Vec3, tween, UITransform, Prefab, director } from 'cc';
import { CardCtrl } from './CardCtrl';
import { CardSpawnManager } from './CardSpawnManager';
import { CardInteractionManager } from './CardInteractionManager';
import { EventBus, GameEvent } from '../Events/GameEvents';
import { CardTargetType, CardType } from './CardData';
import { EnemyManager } from '../Enemies/EnemyManager';
import { PlayerManager } from './PlayerManager';
const { ccclass, property } = _decorator;

@ccclass('CardManager')
export class CardManager extends Component {
    public static instance: CardManager | null = null;

    @property({ type: CardSpawnManager, tooltip: 'Kéo node Deck (có gắn CardSpawnManager) vào đây' })
    public cardSpawner: CardSpawnManager = null!;

    @property({ type: CardInteractionManager, tooltip: 'Kéo node Table (có gắn CardInteractionManager) vào đây' })
    public interactionManager: CardInteractionManager = null!;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Tấn Công' })
    public atkCardPrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Rút Thêm' })
    public drawCardPrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Hồi Máu' })
    public healCardPrefab: Prefab = null!;

    @property({ type: Node, tooltip: 'Kéo node CardHold vào đây' })
    public cardHoldNode: Node = null!;

    @property({ type: Node, tooltip: 'Kéo node Deck vào đây' })
    public deckNode: Node = null!;

    @property({ type: Node, tooltip: 'Kéo node PlayZone vào đây' })
    public playZoneNode: Node = null!;

    @property({ type: Node, tooltip: 'Kéo node DiscardZone vào đây' })
    public discardNode: Node = null!;

    @property({ type: Node, tooltip: 'Kéo node DragLayer vào đây' })
    public dragLayerNode: Node = null!;

    @property({ type: [Node], tooltip: 'Kéo 3 node ô bài vào đây: Slot1, Slot2, Slot3' })
    public slotNodes: Node[] = [];

    @property({ tooltip: 'Số lượng bài tối đa cầm trên tay' })
    public maxHandSize: number = 10;

    @property({ tooltip: 'Khoảng cách giữa tâm 2 lá bài trên tay' })
    public cardSpacing: number = 108;

    @property({ tooltip: 'Tỉ lệ scale của lá bài trên tay', min: 0.3, max: 1.5, step: 0.05 })
    public cardScale: number = 0.68;

    // --- QUẢN LÝ BÀI TRÊN TAY & BÀN CHƠI ---
    private _handCards: CardCtrl[] = [];
    private _discardPile: string[] = [];
    private _slotCards: (CardCtrl | null)[] = [null, null, null];

    public get handCards(): CardCtrl[] {
        return this._handCards;
    }

    public get discardPile(): string[] {
        return this._discardPile;
    }

    public get slotCards(): (CardCtrl | null)[] {
        return this._slotCards;
    }

    public getCardSlotIndex(cardCtrl: CardCtrl): number {
        return this._slotCards.indexOf(cardCtrl);
    }

    onLoad() {
        CardManager.instance = this;
        director.resume();
    }

    onDestroy() {
        if (CardManager.instance === this) {
            CardManager.instance = null;
        }
    }

    start() {
        director.resume();

        if (this.cardSpawner) {
            this.cardSpawner.initDeckSpawner();
        }

        this.clearHand();
        this._discardPile = [];

        // Rút 5 lá bài ban đầu từ Deck về tay ở đầu trận
        this.dealInitialHand(5);
    }

    // =========================================================================
    // 1. TÁI CHẾ TỨC THÌ DISCARD -> DECK KHI HẾT BÀI
    // =========================================================================

    /**
     * Sau khi deck hết lá, lập tức lôi tất cả lá trong discard sang theo đúng thứ tự đã vào:
     * Lá nào vào Discard trước sẽ được rút trước (FIFO).
     */
    public checkAndReloadDeckIfEmpty(): void {
        if (!this.cardSpawner) return;

        if (this.cardSpawner.remainingCards === 0 && this._discardPile.length > 0) {
            console.log(`[CardManager] Deck đã hết lá! Lập tức nạp lại ${this._discardPile.length} lá từ Discard sang Deck theo đúng thứ tự!`);
            const cardsToReload = [...this._discardPile];
            this._discardPile = [];
            this.cardSpawner.reloadDeckFromDiscard(cardsToReload);
            EventBus.emit(GameEvent.DECK_RELOADED, { count: cardsToReload.length });
        }
    }

    // =========================================================================
    // 2. RÚT BÀI TỪ DECK SPAWNER VỀ TAY
    // =========================================================================

    /**
     * Rút n lá từ Deck Spawner bay về tay (Mặc định 1 lá nếu không truyền tham số)
     */
    public dealInitialHand(count: number = 1): void {
        for (let i = 0; i < count; i++) {
            tween(this.node)
                .delay(0.08 + i * 0.12)
                .call(() => {
                    this.drawCardFromDeckAnimated();
                })
                .start();
        }
    }

    /**
     * Rút 1 lá từ Deck Spawner:
     * - Deck Spawner lấy lá trên cùng và tự động bật lá tiếp theo lên
     * - Nếu Deck hết lá, lập tức nạp lại từ Discard
     * - Lá vừa rút bay mượt mà từ Deck về vị trí trên tay
     */
    public drawCardFromDeckAnimated(): CardCtrl | null {
        if (this._handCards.length >= this.maxHandSize) {
            console.log("[CardManager] Tay đã đủ bài tối đa.");
            return null;
        }
        if (!this.cardSpawner) return null;

        // Nếu Deck hết bài, lập tức tái chế từ Discard sang Deck theo đúng thứ tự đã vào
        this.checkAndReloadDeckIfEmpty();

        if (this.cardSpawner.remainingCards === 0) {
            console.log("[CardManager] Cả Deck và Discard đều đã hết bài.");
            return null;
        }

        // Rút lá trên cùng ra khỏi Spawner
        const cardCtrl = this.cardSpawner.popTopCard();
        if (!cardCtrl) return null;

        // Giữ vị trí thế giới tại Deck trước khi chuyển quyền quản lý sang CardHold
        const startWorldPos = cardCtrl.node.worldPosition.clone();
        cardCtrl.node.setParent(this.cardHoldNode);
        cardCtrl.node.setWorldPosition(startWorldPos);

        this._handCards.push(cardCtrl);

        // Tính toán vị trí đích trên tay
        const total = this._handCards.length;
        const targetPos = this.calculateHandCardPosition(total - 1, total);
        const targetScale = new Vec3(this.cardScale, this.cardScale, 1);

        cardCtrl.setBasePosition(targetPos);

        // Tween bay từ Deck về vị trí trên tay và phóng to lên cardScale rõ nét
        tween(cardCtrl.node)
            .to(0.28, {
                position: targetPos,
                scale: targetScale
            }, { easing: 'sineOut' })
            .call(() => {
                this.repositionHandCards(false);
            })
            .start();

        this.repositionHandCards(true);
        return cardCtrl;
    }

    /**
     * Tính toán vị trí X tối ưu của lá bài trên tay để luôn nằm gọn trong màn hình
     */
    public calculateHandCardPosition(index: number, total: number): Vec3 {
        const maxAvailableWidth = 440;
        let actualSpacing = this.cardSpacing;
        if (total > 1) {
            actualSpacing = Math.min(this.cardSpacing, maxAvailableWidth / (total - 1));
        }
        const totalWidth = (total - 1) * actualSpacing;
        const startX = -totalWidth / 2;
        return new Vec3(startX + index * actualSpacing, 0, 0);
    }

    /**
     * Dàn đều tất cả lá bài hiện có ra giữa CardHold, không bị đè che mất nội dung
     */
    public repositionHandCards(animate: boolean = true): void {
        const total = this._handCards.length;
        if (total === 0) return;

        const targetScale = new Vec3(this.cardScale, this.cardScale, 1);

        for (let i = 0; i < total; i++) {
            const cardCtrl = this._handCards[i];
            const targetPos = this.calculateHandCardPosition(i, total);

            cardCtrl.setBasePosition(targetPos);

            if (animate) {
                tween(cardCtrl.node)
                    .to(0.2, { position: targetPos, scale: targetScale }, { easing: 'sineOut' })
                    .start();
            } else {
                cardCtrl.node.setPosition(targetPos);
                cardCtrl.node.setScale(targetScale);
            }

            cardCtrl.node.setSiblingIndex(i);
        }
    }

    public onCardStartDrag(cardCtrl: CardCtrl): void {
        const index = this._handCards.indexOf(cardCtrl);
        if (index !== -1) {
            this._handCards.splice(index, 1);
            this.repositionHandCards(true);
        }
    }

    public onSlotCardStartDrag(cardCtrl: CardCtrl, slotIndex: number): void {
        if (slotIndex >= 0 && slotIndex < this._slotCards.length) {
            if (this._slotCards[slotIndex] === cardCtrl) {
                this._slotCards[slotIndex] = null;
            }
        }
    }

    // =========================================================================
    // 3. XỬ LÝ ĐÁNH BÀI VÀO SLOT & HOÀN BÀI VỀ TAY
    // =========================================================================

    public handleCardDrop(cardCtrl: CardCtrl, originalIndex: number, fromSlotIndex: number = -1): void {
        if (this.interactionManager) {
            this.interactionManager.endDrag(cardCtrl, originalIndex, fromSlotIndex);
        } else {
            this.returnCardToHand(cardCtrl, originalIndex);
        }
    }

    public findAvailableSlotIndex(): number {
        for (let i = 0; i < this.slotNodes.length; i++) {
            if (this._slotCards[i] === null) {
                return i;
            }
        }
        return -1;
    }

    public calculateFitScale(slotNode: Node): number {
        const slotTrans = slotNode.getComponent(UITransform);
        if (!slotTrans) return 0.28;

        const originalWidth = 393;
        const originalHeight = 478;

        const scaleX = slotTrans.contentSize.width / originalWidth;
        const scaleY = slotTrans.contentSize.height / originalHeight;

        return Math.min(scaleX, scaleY) * 0.95;
    }

    /**
     * Đánh lá bài vào Slot:
     * - Nếu Slot đã có bài từ trước: Hoàn lại lá bài cũ về tay người chơi
     * - Lá bài mới lướt vào Slot và thu nhỏ vừa khít ô không biến dạng
     */
    public playCardToSlot(cardCtrl: CardCtrl, slotIndex: number): void {
        const slotNode = this.slotNodes[slotIndex];
        if (!slotNode) return;

        // Nếu Slot đã có bài từ trước -> Hoàn lại lá bài cũ về tay người chơi
        const oldCard = this._slotCards[slotIndex];
        if (oldCard && oldCard !== cardCtrl) {
            console.log(`[CardManager] Đổi bài: Hoàn lại lá cũ "${oldCard.config.name}" về tay!`);
            this._slotCards[slotIndex] = null;
            this.returnOldSlotCardToHand(oldCard);
        }

        const slotTrans = slotNode.getComponent(UITransform);
        const fitScale = this.calculateFitScale(slotNode);
        const slotWorldPos = slotTrans ? slotTrans.convertToWorldSpaceAR(Vec3.ZERO) : slotNode.worldPosition;

        const dragLayerTrans = this.dragLayerNode?.getComponent(UITransform);
        let localTargetInDrag = new Vec3();
        if (dragLayerTrans) {
            dragLayerTrans.convertToNodeSpaceAR(slotWorldPos, localTargetInDrag);
        } else {
            localTargetInDrag.set(slotWorldPos);
        }

        tween(cardCtrl.node)
            .to(0.25, {
                position: localTargetInDrag,
                scale: new Vec3(fitScale, fitScale, 1)
            }, { easing: 'sineOut' })
            .call(() => {
                cardCtrl.node.setParent(slotNode);
                cardCtrl.node.setPosition(Vec3.ZERO);
                cardCtrl.node.setScale(new Vec3(fitScale, fitScale, 1));
                this._slotCards[slotIndex] = cardCtrl;
                EventBus.emit(GameEvent.CARD_PLAYED_TO_SLOT, { card: cardCtrl, slotIndex });
            })
            .start();

        this.repositionHandCards(true);
    }

    // =========================================================================
    // 4. KÍCH HOẠT CHUỖI BÀI TRONG SLOT (STATE PATTERN - RESOLVE CARDS)
    // =========================================================================

    /**
     * Kích hoạt tuần tự các lá bài trong Slot1 -> Slot2 -> Slot3
     * Sau khi kích hoạt, lá bài được chuyển vào DiscardZone.
     * Nếu Deck hết bài, lập tức lôi các lá từ Discard về Deck.
     */
    public executeSlotCards(onComplete: () => void): void {
        const slotsToRun = [...this._slotCards];
        let currentIndex = 0;
        let isStopped = false;

        const stopExecution = () => {
            if (isStopped) return;
            isStopped = true;
            onComplete();
        };

        const runNextSlot = () => {
            if (isStopped) return;

            // KIỂM TRA NGAY: Nếu toàn bộ quái đã bị hạ gục -> Dừng ngay lập tức!
            if (EnemyManager.instance && EnemyManager.instance.isAllEnemiesDead()) {
                console.log('[CardManager] Toàn bộ quái đã bị tiêu diệt! Lập tức dừng chuỗi bài!');
                stopExecution();
                return;
            }

            if (currentIndex >= slotsToRun.length) {
                stopExecution();
                return;
            }

            const cardCtrl = slotsToRun[currentIndex];
            const slotIdx = currentIndex;
            currentIndex++;

            if (!cardCtrl) {
                runNextSlot();
                return;
            }

            // Kích hoạt hiệu ứng thẻ bài
            this.activateCardEffect(cardCtrl, () => {
                this._slotCards[slotIdx] = null;
                this.discardCardWithAnimation(cardCtrl, false);
                EventBus.emit(GameEvent.CARD_EXECUTED, { card: cardCtrl, slotIndex: slotIdx });

                // KIỂM TRA NGAY SAU KHI LÁ BÀI GÂY SÁT THƯƠNG:
                if (EnemyManager.instance && EnemyManager.instance.isAllEnemiesDead()) {
                    console.log('[CardManager] Đòn đánh vừa tiêu diệt quái cuối cùng! Dừng các lá bài sau ngay!');
                    stopExecution();
                    return;
                }

                setTimeout(() => {
                    if (isStopped) return;
                    runNextSlot();
                }, 350);
            });
        };

        runNextSlot();
    }

    private activateCardEffect(cardCtrl: CardCtrl, onFinished: () => void): void {
        const config = cardCtrl.config;
        if (!config) {
            onFinished();
            return;
        }

        const originalScale = cardCtrl.node.scale.clone();
        tween(cardCtrl.node)
            .to(0.12, { scale: new Vec3(originalScale.x * 1.25, originalScale.y * 1.25, 1) })
            .to(0.12, { scale: originalScale })
            .call(() => {
                switch (config.type) {
                    case CardType.ATK: {
                        const living = EnemyManager.instance?.getLivingEnemies() || [];
                        if (living.length > 0) {
                            if (config.targetType === CardTargetType.ALL_ENEMIES) {
                                living.forEach(e => e.takeDamage(config.value));
                            } else if (config.targetType === CardTargetType.RANDOM_ENEMY) {
                                const count = config.targetCount ?? 2;
                                for (let c = 0; c < count; c++) {
                                    const currentLiving = EnemyManager.instance?.getLivingEnemies() || [];
                                    if (currentLiving.length > 0) {
                                        const randEnemy = currentLiving[Math.floor(Math.random() * currentLiving.length)];
                                        randEnemy?.takeDamage(config.value);
                                    }
                                }
                            } else {
                                living[0].takeDamage(config.value);
                            }
                        } else {
                            console.log('[CardManager] Đã tiêu diệt hết quái, không còn mục tiêu dính đòn.');
                        }
                        break;
                    }

                    case CardType.HEAL: {
                        PlayerManager.instance?.heal(config.value);
                        break;
                    }

                    case CardType.DRAW: {
                        this.dealInitialHand(config.value);
                        break;
                    }
                }

                onFinished();
            })
            .start();
    }

    /**
     * Hoàn lại lá bài cũ đang ở Slot về lại bộ bài trên tay (khi đổi bài hoặc kéo về tay)
     */
    public returnOldSlotCardToHand(oldCard: CardCtrl): void {
        this._handCards.push(oldCard);

        const currentWorldPos = oldCard.node.worldPosition.clone();
        oldCard.node.setParent(this.cardHoldNode);
        oldCard.node.setWorldPosition(currentWorldPos);

        const total = this._handCards.length;
        const targetIndex = this._handCards.indexOf(oldCard);
        const targetPos = this.calculateHandCardPosition(targetIndex, total);
        const targetScale = new Vec3(this.cardScale, this.cardScale, 1);

        oldCard.setBasePosition(targetPos);

        tween(oldCard.node)
            .to(0.28, {
                position: targetPos,
                scale: targetScale
            }, { easing: 'sineOut' })
            .call(() => {
                this.repositionHandCards(false);
            })
            .start();

        this.repositionHandCards(true);
        EventBus.emit(GameEvent.CARD_RETURNED_TO_HAND, { card: oldCard });
    }

    // =========================================================================
    // 5. HIỆU ỨNG DISCARD & TÁI CHẾ VỀ POOL / NẠP LẠI DECK
    // =========================================================================

    public discardCardWithAnimation(cardCtrl: CardCtrl, isManualDiscard: boolean = false): void {
        if (isManualDiscard && PlayerManager.instance) {
            const gainedMana = cardCtrl.manaCost;
            PlayerManager.instance.gainMana(gainedMana);
            console.log(`[CardManager] Discard thủ công lá "${cardCtrl.config.name}" -> Nhận +${gainedMana} Mana!`);
        }

        const slotIndex = this._slotCards.indexOf(cardCtrl);
        if (slotIndex !== -1) {
            this._slotCards[slotIndex] = null;
        }

        if (!this.discardNode) {
            this._discardPile.push(cardCtrl.config.id);
            EventBus.emit(GameEvent.CARD_DISCARDED, { card: cardCtrl, isManual: isManualDiscard });
            if (this.cardSpawner) this.cardSpawner.recycleCard(cardCtrl);
            this.checkAndReloadDeckIfEmpty();
            return;
        }

        const discardTrans = this.discardNode.getComponent(UITransform);
        const discardWorldPos = discardTrans ? discardTrans.convertToWorldSpaceAR(Vec3.ZERO) : this.discardNode.worldPosition;

        const parentTrans = cardCtrl.node.parent?.getComponent(UITransform);
        let localTarget = new Vec3();
        if (parentTrans) {
            parentTrans.convertToNodeSpaceAR(discardWorldPos, localTarget);
        } else {
            localTarget.set(discardWorldPos);
        }

        tween(cardCtrl.node)
            .to(0.25, {
                position: localTarget,
                scale: Vec3.ZERO
            }, { easing: 'sineIn' })
            .call(() => {
                this._discardPile.push(cardCtrl.config.id);
                EventBus.emit(GameEvent.CARD_DISCARDED, { card: cardCtrl, isManual: isManualDiscard });

                if (this.cardSpawner) {
                    this.cardSpawner.recycleCard(cardCtrl);
                } else {
                    cardCtrl.node.destroy();
                }

                // Nếu Deck đang hết lá, lập tức lôi các lá trong discard sang theo đúng thứ tự đã vào!
                this.checkAndReloadDeckIfEmpty();
            })
            .start();

        this.repositionHandCards(true);
    }

    public returnCardToHand(cardCtrl: CardCtrl, insertIndex: number): void {
        if (insertIndex < 0 || insertIndex > this._handCards.length) {
            this._handCards.push(cardCtrl);
        } else {
            this._handCards.splice(insertIndex, 0, cardCtrl);
        }

        const total = this._handCards.length;
        const targetIndex = this._handCards.indexOf(cardCtrl);
        const targetPos = this.calculateHandCardPosition(targetIndex, total);
        const targetScale = new Vec3(this.cardScale, this.cardScale, 1);

        cardCtrl.setBasePosition(targetPos);

        const holdTrans = this.cardHoldNode.getComponent(UITransform);
        const dragLayerTrans = this.dragLayerNode?.getComponent(UITransform);

        if (cardCtrl.node.parent === this.dragLayerNode && holdTrans && dragLayerTrans) {
            const targetWorldPos = holdTrans.convertToWorldSpaceAR(targetPos);
            const localTargetInDrag = new Vec3();
            dragLayerTrans.convertToNodeSpaceAR(targetWorldPos, localTargetInDrag);

            tween(cardCtrl.node)
                .to(0.2, { position: localTargetInDrag, scale: targetScale }, { easing: 'sineOut' })
                .call(() => {
                    cardCtrl.node.setParent(this.cardHoldNode);
                    cardCtrl.node.setPosition(targetPos);
                    this.repositionHandCards(false);
                })
                .start();
        } else {
            cardCtrl.node.setParent(this.cardHoldNode);
            tween(cardCtrl.node)
                .to(0.2, { position: targetPos, scale: targetScale }, { easing: 'sineOut' })
                .call(() => {
                    this.repositionHandCards(false);
                })
                .start();
        }

        this.repositionHandCards(true);
        EventBus.emit(GameEvent.CARD_RETURNED_TO_HAND, { card: cardCtrl });
    }

    private clearHand(): void {
        for (const card of this._handCards) {
            if (card && card.node) {
                if (this.cardSpawner) {
                    this.cardSpawner.recycleCard(card);
                } else {
                    card.node.destroy();
                }
            }
        }
        this._handCards = [];
    }
}
