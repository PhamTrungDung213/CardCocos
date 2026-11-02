import { _decorator, Component, Node, Prefab, instantiate, Vec3, NodePool, UITransform, Layers, tween } from 'cc';
import { CardType, ICardConfig } from './CardData';
import { CARD_DATABASE, generateRandomStarterDeck } from './CardDatabase';
import { CardCtrl } from './CardCtrl';
import { CardFactory } from './CardFactory';
import { EventBus, GameEvent } from '../Events/GameEvents';
import { CardManager } from './CardManager';
const { ccclass, property } = _decorator;

@ccclass('CardSpawnManager')
export class CardSpawnManager extends Component {
    public static instance: CardSpawnManager | null = null;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Tấn Công' })
    public atkCardPrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Rút Thêm' })
    public drawCardPrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Hồi Máu' })
    public healCardPrefab: Prefab = null!;

    @property({ tooltip: 'Tỉ lệ scale của lá bài khi nằm trong Deck', min: 0.1, max: 1.0, step: 0.02 })
    public deckCardScale: number = 0.28;

    // --- DANH SÁCH BÀI TRONG DECK & OBJECT POOLS ---
    private _deckCards: CardCtrl[] = [];
    private _cardPools: Map<CardType, NodePool> = new Map();

    public get deckCards(): CardCtrl[] {
        return this._deckCards;
    }

    public get remainingCards(): number {
        return this._deckCards.length;
    }

    onLoad() {
        CardSpawnManager.instance = this;
        this.ensurePools();
    }

    onDestroy() {
        if (CardSpawnManager.instance === this) {
            CardSpawnManager.instance = null;
        }

        this.clearDeck();
        this._cardPools.forEach(pool => pool.clear());
        this._cardPools.clear();
    }

    private ensurePools(): void {
        if (this._cardPools.size === 0) {
            this._cardPools.set(CardType.ATK, new NodePool());
            this._cardPools.set(CardType.DRAW, new NodePool());
            this._cardPools.set(CardType.HEAL, new NodePool());
        }
    }

    // =========================================================================
    // 1. DECK SPAWNER: 5 ATK, 5 HEAL, 5 DRAW NGẪU NHIÊN ĐÃ ĐƯỢC TRỘN ĐỀU
    // =========================================================================

    /**
     * Khởi tạo bộ bài ban đầu gồm:
     * - 5 lá ATK (ngẫu nhiên loại)
     * - 5 lá HEAL (ngẫu nhiên loại)
     * - 5 lá DRAW (ngẫu nhiên loại)
     * Toàn bộ đã được trộn đều (shuffle) trước khi nạp vào Deck.
     * Chỉ hiển thị 3 lá trên cùng, các lá còn lại ẩn đi.
     */
    public initDeckSpawner(): void {
        this.ensurePools();
        this.clearDeck();

        // Lấy danh sách 15 lá đã được chọn ngẫu nhiên loại và trộn đều (Shuffle)
        const shuffledDeckIds = generateRandomStarterDeck();

        for (const cardId of shuffledDeckIds) {
            const config = CARD_DATABASE[cardId];
            if (!config) continue;

            const cardNode = this.spawnCardNode(config.type);
            if (!cardNode) continue;

            const cardCtrl = cardNode.getComponent(CardCtrl)!;
            cardCtrl.initCard(config);

            this.node.addChild(cardNode);
            this._deckCards.push(cardCtrl);
        }

        this.updateDeckDisplay();
        console.log(`[CardSpawnManager] Đã khởi tạo Spawner Deck với ${this._deckCards.length} lá đã trộn.`);
    }

    /**
     * Cập nhật hiển thị trong Deck:
     * - Chỉ hiển thị đúng 3 lá trên cùng
     * - Tất cả các lá còn lại trong Deck bị ẩn (active = false)
     */
    public updateDeckDisplay(): void {
        const total = this._deckCards.length;
        const visibleCount = 3;
        const startIndex = Math.max(0, total - visibleCount);

        const offsets = [
            { x: -3, y: -3 },
            { x: 0, y: 0 },
            { x: 3, y: 3 }
        ];

        for (let i = 0; i < total; i++) {
            const card = this._deckCards[i];
            if (i >= startIndex) {
                card.node.active = true;
                const offsetIdx = i - startIndex;
                const offset = offsets[offsetIdx] || { x: 0, y: 0 };

                card.node.setPosition(offset.x, offset.y, 0);
                card.node.setScale(new Vec3(this.deckCardScale, this.deckCardScale, 1));
                card.node.setSiblingIndex(offsetIdx);
            } else {
                card.node.active = false;
            }
        }
    }

    /**
     * Rút 1 lá trên cùng ra khỏi Deck (sau khi đã trộn):
     * - Pop lá trên cùng đang hiển thị
     * - Tự động bật lá tiếp theo lên để Deck luôn duy trì 3 lá hiển thị
     * - Nếu Deck hết lá, lập tức kiểm tra và tái chế từ Discard sang Deck
     */
    public popTopCard(): CardCtrl | null {
        if (this._deckCards.length === 0) return null;

        const cardCtrl = this._deckCards.pop()!;
        this.updateDeckDisplay();

        EventBus.emit(GameEvent.CARD_DRAWN, { card: cardCtrl });

        // Nếu vừa rút hết lá cuối cùng của Deck, lập tức nạp lại từ Discard
        if (this._deckCards.length === 0 && CardManager.instance) {
            CardManager.instance.checkAndReloadDeckIfEmpty();
        }

        return cardCtrl;
    }

    /**
     * Kiểm tra xem 1 lá bài có đang nằm trong Deck hay không
     */
    public isCardInDeck(cardCtrl: CardCtrl): boolean {
        return this._deckCards.indexOf(cardCtrl) !== -1;
    }

    /**
     * Tái chế các lá bài từ Discard về lại Deck theo đúng thứ tự đã vào Discard:
     * Lá bài nào vào Discard trước sẽ được rút trước (FIFO).
     */
    public reloadDeckFromDiscard(discardCardIds: string[]): void {
        if (discardCardIds.length === 0) return;
        this.ensurePools();

        // Vì popTopCard lấy từ cuối mảng (pop), ta đảo ngược mảng discardCardIds
        // để lá bài đầu tiên của Discard nằm ở cuối mảng _deckCards -> được pop đầu tiên!
        const cardIdsToRestore = [...discardCardIds].reverse();

        for (const cardId of cardIdsToRestore) {
            const config = CARD_DATABASE[cardId];
            if (!config) continue;

            const cardNode = this.spawnCardNode(config.type);
            if (!cardNode) continue;

            const cardCtrl = cardNode.getComponent(CardCtrl)!;
            cardCtrl.initCard(config);

            this.node.addChild(cardNode);
            this._deckCards.push(cardCtrl);
        }

        this.updateDeckDisplay();
        console.log(`[CardSpawnManager] Đã tái chế ${cardIdsToRestore.length} lá từ Discard về Deck theo đúng thứ tự.`);

        // Hiệu ứng nảy nhẹ khi Deck được hồi bài
        tween(this.node)
            .to(0.1, { scale: new Vec3(1.15, 1.15, 1) })
            .to(0.12, { scale: new Vec3(1.0, 1.0, 1) })
            .start();
    }

    // =========================================================================
    // 2. OBJECT POOLING CHO THẺ BÀI
    // =========================================================================

    public spawnCardNode(type: CardType): Node | null {
        this.ensurePools();

        const pool = this._cardPools.get(type);
        let cardNode: Node | null = null;

        if (pool && pool.size() > 0) {
            cardNode = pool.get()!;
        } else if (CardFactory.instance) {
            // Sử dụng Factory Pattern để sinh thẻ bài chuẩn quy cách
            cardNode = CardFactory.instance.createCardNode(type);
        } else {
            const prefab = this.getPrefabByType(type);
            if (!prefab) {
                console.warn(`[CardSpawnManager] Chưa có Prefab cho loại bài: ${type}`);
                return null;
            }
            cardNode = instantiate(prefab);

            // Đảm bảo node gốc luôn có UITransform
            let trans = cardNode.getComponent(UITransform);
            if (!trans) {
                trans = cardNode.addComponent(UITransform);
                const cardBg = cardNode.getChildByName('CardBG');
                const bgTrans = cardBg?.getComponent(UITransform);
                if (bgTrans) {
                    trans.setContentSize(bgTrans.contentSize.width, bgTrans.contentSize.height);
                    trans.setAnchorPoint(bgTrans.anchorPoint);
                } else {
                    trans.setContentSize(393, 478);
                }
            }

            this.setLayerRecursively(cardNode, Layers.Enum.UI_2D);
        }

        if (cardNode) {
            cardNode.active = true;
        }
        return cardNode;
    }

    public recycleCard(cardCtrl: CardCtrl): void {
        this.ensurePools();

        const type = cardCtrl.config.type;
        const node = cardCtrl.node;

        node.active = false;
        node.removeFromParent();

        const pool = this._cardPools.get(type);
        if (pool) {
            pool.put(node);
        } else {
            node.destroy();
        }
    }

    public clearDeck(): void {
        for (const card of this._deckCards) {
            if (card && card.node) {
                this.recycleCard(card);
            }
        }
        this._deckCards = [];
    }

    private getPrefabByType(type: CardType): Prefab | null {
        switch (type) {
            case CardType.ATK: return this.atkCardPrefab;
            case CardType.DRAW: return this.drawCardPrefab;
            case CardType.HEAL: return this.healCardPrefab;
            default: return null;
        }
    }

    private setLayerRecursively(node: Node, layer: number): void {
        node.layer = layer;
        for (const child of node.children) {
            this.setLayerRecursively(child, layer);
        }
    }
}
