import { Scene } from "phaser";

export class GameOver extends Scene {
    constructor() {
        super("GameOver"); // Nome da cena
    }

    create() {
        this.add.image(512, 384, "gover-background").setDisplaySize(1024, 768);
        // Exibe a mensagem "Game Over"

        // Botão para voltar ao menu
        const retryButton = this.add
            .text(512, 400, "↻ RETRY", {
                fontSize: "28px", // Menor tamanho de fonte
                fontFamily: "Pixellari",
                backgroundColor: "#800000",
                color: "#ffffff",
                padding: { x: 18, y: 12 }, // Menor padding
                align: "center",
                fixedWidth: 180, // Menor largura fixa
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: "#000000",
                    blur: 1,
                    fill: true,
                },
            })
            .setOrigin(0.5)
            .setInteractive();

        // Hover com cor mais clara
        retryButton.on("pointerover", () => {
            retryButton.setStyle({ backgroundColor: "#aa0000" });
        });

        retryButton.on("pointerout", () => {
            retryButton.setStyle({ backgroundColor: "#800000" });
        });

        // Ao clicar no botão, volta para o menu principal
        retryButton.on("pointerdown", () => {
            this.scene.stop("SurvivalGame");
            this.scene.start("SurvivalGame");
        });
    }
}
