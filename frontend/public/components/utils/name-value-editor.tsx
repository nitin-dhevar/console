import { useRef } from 'react';
import type { FC, ChangeEvent, Key } from 'react';
import * as _ from 'lodash';
import { css } from '@patternfly/react-styles';
import { useDrag, useDrop } from 'react-dnd';
import { DRAGGABLE_TYPE } from './draggable-item-types';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Grid,
  GridItem,
  Tooltip,
} from '@patternfly/react-core';
import { GripVerticalIcon, MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';

import { NameValueEditorPair, EnvFromPair, EnvType } from './types';
import { ValueFromPair } from './value-from-pair';
import withDragDropContext from './drag-drop-context';

interface DragItem {
  type: string;
  index: number;
  rowSourceId: number;
}

export type PairValue = string | number | Record<string, unknown>;

interface NameValueEditorProps {
  nameString?: string;
  valueString?: string;
  addString?: string;
  allowSorting?: boolean;
  readOnly?: boolean;
  nameValueId?: number;
  nameValuePairs: PairValue[][];
  updateParentData: (data: { nameValuePairs: PairValue[][] }, nameValueId: number) => void;
  configMaps?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
  addConfigMapSecret?: boolean;
  toolTip?: string;
  onLastItemRemoved?: () => void;
}

interface EnvFromEditorProps {
  readOnly?: boolean;
  nameValueId?: number;
  nameValuePairs: PairValue[][];
  updateParentData: (
    data: { nameValuePairs: PairValue[][] },
    nameValueId: number,
    envType: EnvType,
  ) => void;
  configMaps?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
  serviceAccounts?: Record<string, unknown>;
  firstTitle?: string;
  secondTitle?: string;
  addButtonDisabled?: boolean;
  addButtonLabel?: string;
}

interface PairElementProps {
  nameString: string;
  valueString: string;
  readOnly: boolean;
  index: number;
  pair: PairValue[];
  allowSorting: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>, index: number, type: NameValueEditorPair) => void;
  onRemove: (index: number) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  rowSourceId: number;
  configMaps?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
  isEmpty: boolean;
  disableReorder: boolean;
  toolTip?: string;
  alwaysAllowRemove: boolean;
}

interface EnvFromPairElementProps {
  nameString?: string;
  valueString: string;
  readOnly: boolean;
  index: number;
  pair: PairValue[];
  onChange: (e: ChangeEvent<HTMLInputElement>, index: number, type: EnvFromPair) => void;
  onRemove: (index: number) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  rowSourceId: number;
  configMaps?: Record<string, unknown>;
  secrets?: Record<string, unknown>;
  serviceAccounts?: Record<string, unknown>;
}

const PairElement: FC<PairElementProps> = ({
  nameString,
  valueString,
  readOnly,
  index,
  pair,
  allowSorting,
  onChange,
  onRemove,
  onMove,
  rowSourceId,
  configMaps,
  secrets,
  isEmpty,
  disableReorder,
  toolTip,
  alwaysAllowRemove,
}) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag<DragItem, void, { isDragging: boolean }>({
    item: { type: DRAGGABLE_TYPE.ENV_ROW, index, rowSourceId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DragItem, void, {}>({
    accept: DRAGGABLE_TYPE.ENV_ROW,
    hover: (item, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex || item.rowSourceId !== rowSourceId) {
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        return;
      }
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const handleRemove = () => onRemove(index);
  const handleChangeName = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(e, index, NameValueEditorPair.Name);
  const handleChangeValue = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(e, index, NameValueEditorPair.Value);

  return (
    <div
      className="pf-v6-l-grid__item"
      ref={(node) => {
        ref.current = node;
        drop(node);
        dragPreview(node);
      }}
    >
      <Grid
        hasGutter
        className={css(isDragging ? 'pairs-list__row-dragging' : 'pairs-list__row')}
        data-test="pairs-list-row"
      >
        {allowSorting && !readOnly && (
          <GridItem span={1} className="pairs-list__action">
            <div ref={disableReorder ? undefined : drag}>
              <Button
                icon={<GripVerticalIcon className="pairs-list__action-icon--reorder" />}
                type="button"
                className="pairs-list__action-icon"
                tabIndex={-1}
                isDisabled={disableReorder}
                variant="plain"
                aria-label={t('public~Drag to reorder')}
              />
            </div>
          </GridItem>
        )}
        <GridItem span={5} className="pairs-list__name-field">
          <span className={css('pf-v6-c-form-control', { 'pf-m-disabled': readOnly })}>
            <input
              type="text"
              data-test="pairs-list-name"
              placeholder={nameString}
              value={pair[NameValueEditorPair.Name] as string}
              onChange={handleChangeName}
              disabled={readOnly}
            />
          </span>
        </GridItem>
        {_.isPlainObject(pair[NameValueEditorPair.Value]) ? (
          <GridItem span={5} className="pairs-list__value-pair-field">
            <ValueFromPair
              data-test="pairs-list-value"
              pair={pair[NameValueEditorPair.Value]}
              configMaps={configMaps}
              secrets={secrets}
              onChange={handleChangeValue}
              disabled={readOnly}
            />
          </GridItem>
        ) : (
          <GridItem span={5} className="pairs-list__value-field">
            <span className={css('pf-v6-c-form-control', { 'pf-m-disabled': readOnly })}>
              <input
                type="text"
                data-test="pairs-list-value"
                placeholder={valueString}
                value={(pair[NameValueEditorPair.Value] as string) || ''}
                onChange={handleChangeValue}
                disabled={readOnly}
              />
            </span>
          </GridItem>
        )}
        {!readOnly && (
          <GridItem span={1} className="pairs-list__action">
            <Tooltip content={toolTip || t('public~Remove')}>
              <Button
                icon={<MinusCircleIcon className="pairs-list__delete-icon" />}
                type="button"
                data-test="delete-button"
                aria-label={t('public~Delete')}
                className={css({
                  'pairs-list__span-btns': allowSorting,
                })}
                onClick={handleRemove}
                isDisabled={isEmpty && !alwaysAllowRemove}
                variant="plain"
              />
            </Tooltip>
          </GridItem>
        )}
      </Grid>
    </div>
  );
};

const EnvFromPairElement: FC<EnvFromPairElementProps> = ({
  valueString,
  readOnly,
  index,
  pair,
  onChange,
  onRemove,
  onMove,
  rowSourceId,
  configMaps,
  secrets,
  serviceAccounts,
}) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag<DragItem, void, { isDragging: boolean }>({
    item: { type: DRAGGABLE_TYPE.ENV_FROM_ROW, index, rowSourceId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DragItem, void, {}>({
    accept: DRAGGABLE_TYPE.ENV_FROM_ROW,
    hover: (item, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex || item.rowSourceId !== rowSourceId) {
        return;
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        return;
      }
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const handleRemove = () => onRemove(index);
  const handleChangePrefix = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(e, index, EnvFromPair.Prefix);
  const handleChangeResource = (e: ChangeEvent<HTMLInputElement>) =>
    onChange(e, index, EnvFromPair.Resource);

  const deleteButton = (
    <>
      <MinusCircleIcon className="pairs-list__side-btn pairs-list__delete-icon" />
      <span className="pf-v6-u-screen-reader">{t('public~Delete')}</span>
    </>
  );

  return (
    <div
      className="pf-v6-l-grid__item"
      ref={(node) => {
        ref.current = node;
        drop(node);
        dragPreview(node);
      }}
    >
      <Grid hasGutter className={css(isDragging ? 'pairs-list__row-dragging' : 'pairs-list__row')}>
        {!readOnly && (
          <div ref={drag} className="pf-v6-l-grid__item pf-m-1-col pairs-list__action">
            <Button
              icon={<GripVerticalIcon className="pairs-list__action-icon--reorder" />}
              type="button"
              className="pairs-list__action-icon"
              tabIndex={-1}
              variant="plain"
              aria-label={t('public~Drag to reorder')}
            />
          </div>
        )}
        <GridItem span={5} className="pairs-list__value-pair-field">
          <ValueFromPair
            pair={pair[EnvFromPair.Resource]}
            configMaps={configMaps}
            secrets={secrets}
            serviceAccounts={serviceAccounts}
            onChange={handleChangeResource}
            disabled={readOnly}
          />
        </GridItem>
        <GridItem span={5} className="pairs-list__name-field">
          <span className={css('pf-v6-c-form-control', { 'pf-m-disabled': readOnly })}>
            <input
              data-test-id="env-prefix"
              type="text"
              placeholder={valueString}
              value={pair[EnvFromPair.Prefix] as string}
              onChange={handleChangePrefix}
              disabled={readOnly}
            />
          </span>
        </GridItem>
        {readOnly ? null : (
          <GridItem span={1} className="pairs-list__action">
            <Tooltip content={t('public~Remove')}>
              <Button
                icon={deleteButton}
                type="button"
                data-test-id="pairs-list__delete-from-btn"
                className="pairs-list__span-btns"
                onClick={handleRemove}
                variant="plain"
              />
            </Tooltip>
          </GridItem>
        )}
      </Grid>
    </div>
  );
};

const NameValueEditorInner: FC<NameValueEditorProps> = ({
  nameValuePairs,
  updateParentData,
  nameValueId = 0,
  allowSorting = false,
  readOnly = false,
  addString,
  configMaps,
  secrets,
  addConfigMapSecret = false,
  toolTip,
  onLastItemRemoved,
  ...props
}) => {
  const { t } = useTranslation();
  const nameString = props.nameString || t('public~Key');
  const valueString = props.valueString || t('public~Value');

  const handleAppend = () => {
    updateParentData(
      { nameValuePairs: nameValuePairs.concat([['', '', nameValuePairs.length]]) },
      nameValueId,
    );
  };

  const handleAppendConfigMapOrSecret = () => {
    const configMapSecretKeyRef = { name: '', key: '' };
    updateParentData(
      {
        nameValuePairs: nameValuePairs.concat([
          ['', { configMapSecretKeyRef }, nameValuePairs.length],
        ]),
      },
      nameValueId,
    );
  };

  const handleRemove = (i: number) => {
    const pairs = _.cloneDeep(nameValuePairs);
    pairs.splice(i, 1);
    pairs.forEach((values, idx) => (values[2] = idx));

    updateParentData({ nameValuePairs: pairs.length ? pairs : [['', '', 0]] }, nameValueId);

    if (pairs.length === 0 && !!onLastItemRemoved) {
      onLastItemRemoved();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, i: number, type: NameValueEditorPair) => {
    const pairs = _.cloneDeep(nameValuePairs);
    pairs[i][
      type === NameValueEditorPair.Name ? NameValueEditorPair.Name : NameValueEditorPair.Value
    ] = e.target.value;
    updateParentData({ nameValuePairs: pairs }, nameValueId);
  };

  const handleMove = (dragIndex: number, hoverIndex: number) => {
    const pairs = _.cloneDeep(nameValuePairs);
    const movedPair = pairs[dragIndex];
    pairs[dragIndex] = pairs[hoverIndex];
    pairs[hoverIndex] = movedPair;
    updateParentData({ nameValuePairs: pairs }, nameValueId);
  };

  const pairElems = nameValuePairs.map((pair, i) => {
    const key = _.get(pair, [NameValueEditorPair.Index], i) as Key;
    const isEmpty = nameValuePairs.length === 1 && nameValuePairs[0].every((value) => !value);
    return (
      <PairElement
        onChange={handleChange}
        index={i}
        nameString={nameString}
        valueString={valueString}
        allowSorting={allowSorting}
        readOnly={readOnly}
        pair={pair}
        key={key}
        onRemove={handleRemove}
        onMove={handleMove}
        rowSourceId={nameValueId}
        configMaps={configMaps}
        secrets={secrets}
        isEmpty={isEmpty}
        disableReorder={nameValuePairs.length === 1}
        toolTip={toolTip}
        alwaysAllowRemove={!!onLastItemRemoved}
      />
    );
  });

  return (
    <Grid hasGutter>
      {!readOnly && allowSorting && <GridItem span={1} />}
      <GridItem span={5}>{nameString}</GridItem>
      <GridItem span={5}>{valueString}</GridItem>
      <GridItem span={1} />

      {pairElems}

      <GridItem>
        <ActionList>
          {readOnly ? null : (
            <ActionListGroup>
              <ActionListItem>
                <Button
                  icon={
                    <PlusCircleIcon
                      data-test-id="pairs-list__add-icon"
                      className="co-icon-space-r"
                    />
                  }
                  className="pf-m-link--align-left"
                  data-test="add-button"
                  onClick={handleAppend}
                  type="button"
                  variant="link"
                >
                  {addString ? addString : t('public~Add more')}
                </Button>
              </ActionListItem>
              {addConfigMapSecret && (
                <ActionListItem>
                  <Button
                    icon={
                      <PlusCircleIcon
                        data-test-id="pairs-list__add-icon"
                        className="co-icon-space-r"
                      />
                    }
                    className="pf-m-link--align-left"
                    onClick={handleAppendConfigMapOrSecret}
                    type="button"
                    variant="link"
                  >
                    {t('public~Add from ConfigMap or Secret')}
                  </Button>
                </ActionListItem>
              )}
            </ActionListGroup>
          )}
        </ActionList>
      </GridItem>
    </Grid>
  );
};

export const NameValueEditor: FC<NameValueEditorProps> = withDragDropContext(NameValueEditorInner);
NameValueEditor.displayName = 'Name Value Editor';

const EnvFromEditorInner: FC<EnvFromEditorProps> = ({
  nameValuePairs,
  updateParentData,
  nameValueId = 0,
  readOnly = false,
  configMaps,
  secrets,
  serviceAccounts,
  firstTitle,
  secondTitle,
  addButtonDisabled = false,
  addButtonLabel,
}) => {
  const { t } = useTranslation();

  const handleAppend = () => {
    const configMapSecretRef = { name: '', key: '' };
    updateParentData(
      {
        nameValuePairs: nameValuePairs.concat([
          ['', { configMapSecretRef }, nameValuePairs.length],
        ]),
      },
      nameValueId,
      EnvType.ENV_FROM,
    );
  };

  const handleRemove = (i: number) => {
    const pairs = _.cloneDeep(nameValuePairs);
    pairs.splice(i, 1);
    const configMapSecretRef = { name: '', key: '' };

    updateParentData(
      { nameValuePairs: pairs.length ? pairs : [['', { configMapSecretRef }]] },
      nameValueId,
      EnvType.ENV_FROM,
    );
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, i: number, type: EnvFromPair) => {
    const pairs = _.cloneDeep(nameValuePairs);
    pairs[i][type === EnvFromPair.Prefix ? EnvFromPair.Prefix : EnvFromPair.Resource] =
      e.target.value;
    updateParentData({ nameValuePairs: pairs }, nameValueId, EnvType.ENV_FROM);
  };

  const handleMove = (dragIndex: number, hoverIndex: number) => {
    const pairs = _.cloneDeep(nameValuePairs);
    const movedPair = pairs[dragIndex];
    pairs[dragIndex] = pairs[hoverIndex];
    pairs[hoverIndex] = movedPair;
    updateParentData({ nameValuePairs: pairs }, nameValueId, EnvType.ENV_FROM);
  };

  const pairElems = nameValuePairs.map((pair, i) => {
    const key = _.get(pair, [EnvFromPair.Index], i) as Key;

    return (
      <EnvFromPairElement
        onChange={handleChange}
        index={i}
        valueString=""
        readOnly={readOnly}
        pair={pair}
        key={key}
        onRemove={handleRemove}
        onMove={handleMove}
        rowSourceId={nameValueId}
        configMaps={configMaps}
        secrets={secrets}
        serviceAccounts={serviceAccounts}
      />
    );
  });

  return (
    <Grid hasGutter>
      {!readOnly && <GridItem span={1} />}
      <GridItem span={5} className="pf-v6-u-text-color-subtle">
        {firstTitle || t('public~ConfigMap/Secret')}
      </GridItem>
      <GridItem span={5} className="pf-v6-u-text-color-subtle">
        {secondTitle || t('public~Prefix (optional)')}
      </GridItem>
      <GridItem span={1} />

      {pairElems}

      <GridItem>
        <ActionList>
          <ActionListGroup>
            {!readOnly && (
              <Button
                icon={<PlusCircleIcon />}
                className="pf-m-link--align-left"
                onClick={handleAppend}
                type="button"
                variant="link"
                isDisabled={addButtonDisabled}
              >
                {addButtonLabel || t('public~Add all from ConfigMap or Secret')}
              </Button>
            )}
          </ActionListGroup>
        </ActionList>
      </GridItem>
    </Grid>
  );
};

export const EnvFromEditor: FC<EnvFromEditorProps> = withDragDropContext(EnvFromEditorInner);
