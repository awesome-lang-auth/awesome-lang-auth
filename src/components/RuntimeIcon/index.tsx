import type { ComponentType, ReactNode, SVGProps } from 'react';
import clsx from 'clsx';
import type { RuntimeId } from '@site/src/data/runtimes';
// Imported as React components (SVGR), so every icon is inline SVG.
import NodeSvg from '@site/static/img/icons/nodejs.svg';
import GoSvg from '@site/static/img/icons/go.svg';
import LambdaSvg from '@site/static/img/icons/lambda.svg';
import PythonSvg from '@site/static/img/icons/python.svg';
import RustSvg from '@site/static/img/icons/rust.svg';
import DartSvg from '@site/static/img/icons/dart.svg';
import AngularSvg from '@site/static/img/icons/angular.svg';
import ReactSvg from '@site/static/img/icons/react.svg';
import FlutterSvg from '@site/static/img/icons/flutter.svg';
import styles from './styles.module.css';

const ICONS: Record<RuntimeId, ComponentType<SVGProps<SVGSVGElement>>> = {
  node: NodeSvg,
  go: GoSvg,
  lambda: LambdaSvg,
  python: PythonSvg,
  rust: RustSvg,
  dart: DartSvg,
  angular: AngularSvg,
  react: ReactSvg,
  flutter: FlutterSvg,
};

/** Decorative runtime logo in the runtime's color; the text next to it names it. */
export default function RuntimeIcon({ id, className }: { id: RuntimeId; className?: string }): ReactNode {
  const Icon = ICONS[id];
  return <Icon className={clsx(styles.icon, className)} data-rt={id} aria-hidden="true" focusable="false" />;
}
