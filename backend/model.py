import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import CLIPTextModel, SwinModel

SWIN_MODEL = "microsoft/swin-tiny-patch4-window7-224"
CLIP_MODEL = "openai/clip-vit-base-patch32"
EMBED_DIM = 128
FREEZE_SWIN_STAGES = 2

CLASS_NAMES = ["healthy", "infection", "ischemia", "both"]

CLASS_DESCRIPTIONS = {
    "healthy": (
        "A diabetic foot wound with normal pink color, no visible exudate or pus, "
        "normal moisture level, well-defined and regular wound margins, "
        "superficial or minimal depth. The wound shows healthy tissue appearance "
        "without signs of infection or ischemia."
    ),
    "infection": (
        "A diabetic foot wound with bright red or yellow color and visible pus. "
        "Visible exudate that is yellow, green, or purulent. "
        "Moist or shiny wound surface. Swollen and irregular wound margins. "
        "The wound may appear deep with exposed tissue and signs of bacterial infection."
    ),
    "ischemia": (
        "A diabetic foot wound with pale white, bluish, or dry black discoloration "
        "indicating poor blood supply. No visible exudate. "
        "Completely dry wound surface. Thin, dry, and contracted wound margins. "
        "Often deep and dry wound, indicating tissue necrosis due to ischemia."
    ),
    "both": (
        "A diabetic foot wound showing signs of both infection and ischemia. "
        "Black areas combined with yellow exudate. "
        "Mixed moist and dry regions on the wound surface. "
        "Darkened or irregular margins with swelling. "
        "Deep wound with exudate, showing simultaneous ischemic and infectious features."
    ),
}


class SwinTinyImageEncoder(nn.Module):
    def __init__(self, swin_name, embed_dim, freeze_stages=2):
        super().__init__()
        self.swin = SwinModel.from_pretrained(swin_name)
        self._freeze_stages(freeze_stages)
        swin_hidden = self.swin.config.hidden_size
        self.proj = nn.Sequential(
            nn.Linear(swin_hidden, embed_dim * 2),
            nn.LayerNorm(embed_dim * 2),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(embed_dim * 2, embed_dim),
            nn.Dropout(0.1),
        )

    def _freeze_stages(self, n_stages):
        for param in self.swin.embeddings.parameters():
            param.requires_grad = False
        for i, layer in enumerate(self.swin.encoder.layers):
            if i < n_stages:
                for param in layer.parameters():
                    param.requires_grad = False

    def forward(self, pixel_values):
        outputs = self.swin(pixel_values=pixel_values)
        pooled = outputs.last_hidden_state.mean(dim=1)
        return self.proj(pooled)


class CLIPTextEncoder(nn.Module):
    def __init__(self, clip_name, embed_dim):
        super().__init__()
        self.text_model = CLIPTextModel.from_pretrained(clip_name)
        for param in self.text_model.parameters():
            param.requires_grad = False
        clip_hidden = self.text_model.config.hidden_size
        self.proj = nn.Sequential(
            nn.Linear(clip_hidden, embed_dim * 2),
            nn.LayerNorm(embed_dim * 2),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(embed_dim * 2, embed_dim),
        )

    def forward(self, input_ids, attention_mask):
        outputs = self.text_model(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.pooler_output
        return self.proj(pooled)


class DFUZeroShotModel(nn.Module):
    def __init__(self, swin_name, clip_name, embed_dim, freeze_stages=2, num_classes=4):
        super().__init__()
        self.image_encoder = SwinTinyImageEncoder(swin_name, embed_dim, freeze_stages)
        self.text_encoder = CLIPTextEncoder(clip_name, embed_dim)
        self.logit_scale = nn.Parameter(torch.ones([]) * np.log(1 / 0.07))
        self.num_classes = num_classes

    def encode_image(self, pixel_values):
        return F.normalize(self.image_encoder(pixel_values), dim=-1)

    def encode_text(self, input_ids, attention_mask):
        return F.normalize(self.text_encoder(input_ids, attention_mask), dim=-1)

    def forward(self, pixel_values, text_input_ids, text_attention_masks):
        img_emb = self.encode_image(pixel_values)
        txt_embs = self.encode_text(text_input_ids, text_attention_masks)
        scale = self.logit_scale.exp().clamp(max=100)
        return scale * img_emb @ txt_embs.T

    @torch.no_grad()
    def predict(self, pixel_values, text_input_ids, text_attention_masks):
        self.eval()
        img_emb = self.encode_image(pixel_values)
        txt_embs = self.encode_text(text_input_ids, text_attention_masks)
        cos_sims = img_emb @ txt_embs.T
        preds = cos_sims.argmax(dim=1)
        names = [CLASS_NAMES[p.item()] for p in preds]
        return preds, names
