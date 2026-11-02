import { _decorator, Component, Prefab, instantiate, Node, UITransform, Layers } from 'cc';
import { CardType, ICardConfig } from './CardData';
import { CARD_DATABASE } from './CardDatabase';
import { CardCtrl } from './CardCtrl';
import { CardDragHandler } from './CardDragHandler';
const { ccclass, property } = _decorator;

/**
 * Factory Pattern: Chịu trách nhiệm khởi tạo thẻ bài chuẩn quy cách theo dữ liệu (Data-Driven)
 * Tách biệt hoàn toàn việc tạo đối tượng khỏi logic quản lý của CardManager hay Spawner.
 */
@ccclass('CardFactory')
export class CardFactory extends Component {
    public static instance: CardFactory | null = null;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Tấn Công' })
    public atkPrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Rút Thêm' })
    public drawPrefab: Prefab = null!;

    @property({ type: Prefab, tooltip: 'Prefab thẻ bài Hồi Máu' })
    public healPrefab: Prefab = null!;

    onLoad() {
        CardFactory.instance = this;
    }

    onDestroy() {
        if (CardFactory.instance === this) {
            CardFactory.instance = null;
        }
    }

    /**
     * Tạo một node thẻ bài hoàn chỉnh từ Prefab theo loại, gán cấu hình và component cần thiết
     */
    public createCardNode(type: CardType, config?: ICardConfig): Node | null {
        const prefab = this.getPrefabByType(type);
        if (!prefab) {
            console.error(`[CardFactory] Không tìm thấy Prefab cho loại thẻ: ${type}`);
            return null;
        }

        const cardNode = instantiate(prefab);

        // 1. Đảm bảo node gốc luôn có UITransform
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

        // 2. Đảm bảo component CardCtrl
        let cardCtrl = cardNode.getComponent(CardCtrl);
        if (!cardCtrl) {
            cardCtrl = cardNode.addComponent(CardCtrl);
        }

        // 3. Đảm bảo component CardDragHandler
        let dragHandler = cardNode.getComponent(CardDragHandler);
        if (!dragHandler) {
            dragHandler = cardNode.addComponent(CardDragHandler);
        }

        // 4. Khởi tạo dữ liệu nếu có config truyền vào
        if (config) {
            cardCtrl.initCard(config);
        }

        // 5. Đặt layer UI_2D đệ quy cho toàn bộ cây node con
        this.setLayerRecursively(cardNode, Layers.Enum.UI_2D);

        cardNode.active = true;
        return cardNode;
    }

    /**
     * Tạo thẻ bài trực tiếp từ cardId trong Database
     */
    public createCardFromId(cardId: string): Node | null {
        const config = CARD_DATABASE[cardId];
        if (!config) {
            console.error(`[CardFactory] Không tìm thấy cấu hình cho thẻ có ID: "${cardId}"`);
            return null;
        }
        return this.createCardNode(config.type, config);
    }

    public getPrefabByType(type: CardType): Prefab | null {
        switch (type) {
            case CardType.ATK: return this.atkPrefab;
            case CardType.DRAW: return this.drawPrefab;
            case CardType.HEAL: return this.healPrefab;
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

