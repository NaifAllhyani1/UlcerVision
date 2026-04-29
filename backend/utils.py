import importlib.util
from pathlib import Path
from typing import Callable

import torch
from torchvision import transforms

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def build_image_transform(input_size: int) -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((input_size, input_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ]
    )


def _load_module_from_file(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Model architecture file not found: {path}")
    spec = importlib.util.spec_from_file_location("custom_model_module", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import model file: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _resolve_factory(module) -> Callable[[], torch.nn.Module]:
    for fn_name in ("create_model", "build_model", "get_model"):
        fn = getattr(module, fn_name, None)
        if callable(fn):
            return fn

    model_cls = getattr(module, "Model", None)
    if isinstance(model_cls, type) and issubclass(model_cls, torch.nn.Module):
        return model_cls

    raise RuntimeError(
        "No model factory found in architecture file. "
        "Define one of: create_model(), build_model(), get_model(), or class Model(nn.Module)."
    )


def load_model_from_architecture(model_file: Path) -> torch.nn.Module:
    module = _load_module_from_file(model_file)
    factory = _resolve_factory(module)
    model = factory()
    if not isinstance(model, torch.nn.Module):
        raise RuntimeError("Model factory did not return a torch.nn.Module instance.")
    return model
