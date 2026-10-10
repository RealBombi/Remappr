# -*- mode: python ; coding: utf-8 -*-
import os
import vgamepad

# vgamepad loads ViGEmClient.dll relative to its own package directory and
# ships the ViGEmBus driver installer; bundle both so the packaged backend
# can create virtual pads and offer the driver install.
_vg_root = os.path.dirname(vgamepad.__file__)
_vg_datas = [
    (os.path.join(_vg_root, 'win', 'vigem', 'client', 'x64', 'ViGEmClient.dll'), 'vgamepad/win/vigem/client/x64'),
    (os.path.join(_vg_root, 'win', 'vigem', 'install', 'x64', 'ViGEmBusSetup_x64.msi'), 'vgamepad/win/vigem/install/x64'),
]


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=_vg_datas,
    hiddenimports=['pygame', 'pygame.joystick', 'pygame.event', 'pygame._sdl2', 'pygame._sdl2.controller', 'vgamepad'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['numpy'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
