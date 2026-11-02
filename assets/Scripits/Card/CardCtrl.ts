import { _decorator, Component, Label, RichText, Vec3, UITransform, Color, Layers, Sprite, Node, Graphics } from 'cc';
import { CardTargetType, CardType, ICardConfig } from './CardData';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('CardCtrl')
@requireComponent(UITransform)
export class CardCtrl extends Component {
    @property({ type: Label, tooltip: 'Node ManaBackground/Label' })
    public manaLabel: Label = null!;

    @property({ type: Label, tooltip: 'Node NameCard' })
    public nameLabel: Label = null!;

    @property({ type: RichText, tooltip: 'Node CardAbility (RichText)' })
    public descRichText: RichText = null!;

    private _config: ICardConfig = null!;
    private _basePosition: Vec3 = new Vec3();
    private _isDragging: boolean = false;

    // --- GETTERS & SETTERS ---
    public get config(): ICardConfig {
        return this._config;
    }

    public get manaCost(): number {
        return this._config ? this._config.manaCost : 0;
    }

    public get isDragging(): boolean {
        return this._isDragging;
    }

    public set isDragging(val: boolean) {
        this._isDragging = val;
    }

    protected onLoad(): void {
        this.node.layer = Layers.Enum.UI_2D;

        let trans = this.getComponent(UITransform);
        if (!trans) {
            trans = this.addComponent(UITransform);
            const cardBg = this.node.getChildByName('CardBG');
            const bgTrans = cardBg?.getComponent(UITransform);
            if (bgTrans) {
                trans.setContentSize(bgTrans.contentSize.width, bgTrans.contentSize.height);
                trans.setAnchorPoint(bgTrans.anchorPoint);
            } else {
                trans.setContentSize(393, 478);
            }
        }

        this.ensureSolidBacking();
    }

    /**
     * TẤM NỀN ĐỤC 100% (Solid Backing Plate) với viền đen tương phản sắc nét
     * Triệt tiêu hoàn toàn hiện tượng "mờ / trong suốt / nhìn xuyên thấu qua nền sân đấu"
     */
    public ensureSolidBacking(): void {
        let solidBgNode = this.node.getChildByName('SolidBacking');
        if (!solidBgNode) {
            solidBgNode = new Node('SolidBacking');
            solidBgNode.layer = this.node.layer;
            this.node.addChild(solidBgNode);
            solidBgNode.setSiblingIndex(0); // Luôn nằm ở lớp đáy cùng, ngay sau CardBG

            const solidTrans = solidBgNode.addComponent(UITransform);
            solidTrans.setContentSize(385, 470);

            const g = solidBgNode.addComponent(Graphics);
            g.fillColor = new Color(250, 248, 240, 255); // Màu trắng kem đặc 100%, không cho nền xuyên qua
            g.strokeColor = new Color(25, 25, 25, 255);   // Viền đen đậm tương phản cao
            g.lineWidth = 4;
            g.roundRect(-192.5, -235, 385, 470, 16);
            g.fill();
            g.stroke();
        }

        // Đảm bảo CardBG luôn đục 100%
        const cardBg = this.node.getChildByName('CardBG');
        if (cardBg) {
            cardBg.layer = this.node.layer;
            const bgSprite = cardBg.getComponent(Sprite);
            if (bgSprite) {
                bgSprite.color = new Color(255, 255, 255, 255);
            }
        }
    }

    /**
     * Nạp dữ liệu cấu hình vào các thành phần hiển thị trên thẻ theo nguyên lý Data-Driven
     * Tối ưu hiển thị sắc nét: Chữ to rõ ràng, in đậm, bật BITMAP cache và outline chống mờ
     */
    public initCard(config: ICardConfig): void {
        this._config = config;
        this.ensureSolidBacking();

        if (this.manaLabel) {
            this.manaLabel.string = config.manaCost.toString();
            this.manaLabel.cacheMode = Label.CacheMode.BITMAP;
            this.manaLabel.fontSize = 28;
            this.manaLabel.isBold = true;
            this.manaLabel.color = new Color(255, 255, 255, 255);
            this.manaLabel.enableOutline = true;
            this.manaLabel.outlineColor = new Color(15, 15, 15, 255);
            this.manaLabel.outlineWidth = 2;
        }

        if (this.nameLabel) {
            this.nameLabel.string = config.name;
            this.nameLabel.cacheMode = Label.CacheMode.BITMAP;
            this.nameLabel.color = new Color(10, 10, 10, 255);
            this.nameLabel.fontSize = 24;
            this.nameLabel.isBold = true;
            this.nameLabel.enableOutline = true;
            this.nameLabel.outlineColor = new Color(255, 255, 255, 255);
            this.nameLabel.outlineWidth = 2;
        }

        if (this.descRichText) {
            this.descRichText.cacheMode = Label.CacheMode.BITMAP;
            this.descRichText.fontColor = new Color(10, 10, 10, 255);
            this.descRichText.fontSize = 25;
            this.descRichText.lineHeight = 31;
            this.descRichText.maxWidth = 310;
            this.descRichText.horizontalAlign = 1; // Căn giữa
            this.descRichText.string = this.generateDescription(config);
        }
    }

    public setBasePosition(pos: Vec3): void {
        this._basePosition.set(pos);
        this.node.setPosition(pos);
    }

    public getBasePosition(): Vec3 {
        return this._basePosition.clone();
    }

    /**
     * Sinh nội dung RichText in đậm, rõ nét:
     * - Chữ mô tả: màu ĐEN đậm (#0a0a0a)
     * - Chỉ số Dame: màu ĐỎ (#e74c3c)
     * - Chỉ số Heal: màu XANH LÁ (#27ae60)
     * - Chỉ số Target / Draw count: màu CAM ĐẬM (#d35400)
     */
    private generateDescription(config: ICardConfig): string {
        if (config.customDesc) {
            return `<color=#0a0a0a><b>${config.customDesc}</b></color>`;
        }

        const redVal = `<color=#e74c3c><b>${config.value}</b></color>`;
        const greenVal = `<color=#27ae60><b>${config.value}</b></color>`;
        const orangeVal = `<color=#d35400><b>${config.value}</b></color>`;

        switch (config.type) {
            case CardType.ATK:
                if (config.targetType === CardTargetType.ALL_ENEMIES) {
                    const allTargets = `<color=#d35400><b>ALL</b></color>`;
                    return `<color=#0a0a0a><b>DEAL </b></color>${redVal}<color=#0a0a0a><b> DMG TO </b></color>${allTargets}<color=#0a0a0a><b> TARGETS</b></color>`;
                }
                if (config.targetType === CardTargetType.RANDOM_ENEMY) {
                    const count = `<color=#d35400><b>${config.targetCount ?? 2}</b></color>`;
                    return `<color=#0a0a0a><b>DEAL </b></color>${redVal}<color=#0a0a0a><b> DMG TO </b></color>${count}<color=#0a0a0a><b> RANDOM</b></color>`;
                }
                const singleTarget = `<color=#d35400><b>1</b></color>`;
                return `<color=#0a0a0a><b>DEAL </b></color>${redVal}<color=#0a0a0a><b> DMG TO </b></color>${singleTarget}<color=#0a0a0a><b> TARGET</b></color>`;

            case CardType.HEAL:
                return `<color=#0a0a0a><b>HEAL </b></color>${greenVal}<color=#0a0a0a><b> HP TO HERO</b></color>`;

            case CardType.DRAW:
                return `<color=#0a0a0a><b>DRAW </b></color>${orangeVal}<color=#0a0a0a><b> ${config.value > 1 ? 'CARDS' : 'CARD'}</b></color>`;

            default:
                return '';
        }
    }
}
