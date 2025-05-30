import * as React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionToggle,
  AccordionContent,
} from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons/dist/esm/icons/in-progress-icon';
import { QuestionCircleIcon } from '@patternfly/react-icons/dist/esm/icons/question-circle-icon';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom-v5-compat';
import {
  useResolvedExtensions,
  DashboardsInventoryItemGroup as DynamicDashboardsInventoryItemGroup,
  isDashboardsInventoryItemGroup as isDynamicDashboardsInventoryItemGroup,
} from '@console/dynamic-plugin-sdk';
import { ResourceInventoryItemProps } from '@console/dynamic-plugin-sdk/src/api/internal-types';
import { pluralize } from '@console/internal/components/utils';
import { resourcePathFromModel } from '@console/internal/components/utils/resource-link';
import { K8sResourceKind, K8sKind, K8sResourceCommon } from '@console/internal/module/k8s';
import {
  useExtensions,
  DashboardsInventoryItemGroup,
  isDashboardsInventoryItemGroup,
} from '@console/plugin-sdk';
import { RedExclamationCircleIcon, YellowExclamationTriangleIcon } from '../../status/icons';
import InventoryItemNew, {
  InventoryItemStatus,
  InventoryItemBody,
  InventoryItemLoading,
} from './InventoryCard';
import { InventoryStatusGroup } from './status-group';
import './inventory-card.scss';

const defaultStatusGroupIcons = {
  [InventoryStatusGroup.WARN]: <YellowExclamationTriangleIcon />,
  [InventoryStatusGroup.ERROR]: <RedExclamationCircleIcon />,
  [InventoryStatusGroup.PROGRESS]: (
    <InProgressIcon className="co-inventory-card__status-icon--progress" />
  ),
  [InventoryStatusGroup.UNKNOWN]: (
    <QuestionCircleIcon className="co-inventory-card__status-icon--question" />
  ),
};

const getStatusGroupIcons = (groups: DashboardsInventoryItemGroup['properties'][]) => {
  const groupStatusIcons = { ...defaultStatusGroupIcons };
  groups.forEach((group) => {
    if (!groupStatusIcons[group.id]) {
      groupStatusIcons[group.id] = group.icon;
    }
  });
  return groupStatusIcons;
};

const getTop3Groups = (
  groups: DashboardsInventoryItemGroup['properties'][],
  groupIDs: string[],
) => {
  const groupStatuses: (InventoryStatusGroup | string)[] = [
    InventoryStatusGroup.ERROR,
    InventoryStatusGroup.WARN,
    InventoryStatusGroup.PROGRESS,
  ];
  groups.forEach((group) => {
    if (!groupStatuses.includes(group.id)) {
      groupStatuses.push(group.id);
    }
  });
  groupStatuses.push(InventoryStatusGroup.UNKNOWN);
  return groupIDs.sort((a, b) => groupStatuses.indexOf(a) - groupStatuses.indexOf(b)).slice(0, 3);
};

export const InventoryItem: React.FC<InventoryItemProps> = React.memo(
  ({
    isLoading,
    title,
    titlePlural,
    count,
    children,
    error = false,
    TitleComponent,
    ExpandedComponent,
    dataTest,
  }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = React.useState(false);
    const onClick = React.useCallback(() => setExpanded(!expanded), [expanded]);
    const titleMessage = pluralize(count, title, titlePlural, !isLoading && !error);
    return ExpandedComponent ? (
      <Accordion
        asDefinitionList={false}
        headingLevel="h5"
        className="co-inventory-card__accordion"
      >
        <AccordionItem isExpanded={expanded}>
          <AccordionToggle
            onClick={onClick}
            id={title}
            className="co-inventory-card__accordion-toggle"
          >
            <InventoryItemNew>
              <div
                className="co-inventory-card__item-title"
                data-test={!TitleComponent ? dataTest : null}
              >
                {isLoading && !error && <div className="skeleton-inventory" />}
                {TitleComponent ? <TitleComponent>{titleMessage}</TitleComponent> : titleMessage}
              </div>
              {!expanded && (error || !isLoading) && (
                <div className="co-inventory-card__item-status">
                  {error ? (
                    <div className="pf-v6-u-text-color-subtle">
                      {t('console-shared~Not available')}
                    </div>
                  ) : (
                    children
                  )}
                </div>
              )}
            </InventoryItemNew>
          </AccordionToggle>
          <AccordionContent className="co-inventory-card__accordion-body">
            <ExpandedComponent />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    ) : (
      <InventoryItemNew>
        <div
          className="co-inventory-card__item-title"
          data-test={!TitleComponent ? dataTest : null}
        >
          {isLoading && !error && <InventoryItemLoading />}
          {TitleComponent ? <TitleComponent>{titleMessage}</TitleComponent> : titleMessage}
        </div>
        <InventoryItemBody error={error}>{children}</InventoryItemBody>
      </InventoryItemNew>
    );
  },
);

export const Status: React.FC<StatusProps> = ({ groupID, count }) => {
  const groupExtensions = useExtensions<DashboardsInventoryItemGroup>(
    isDashboardsInventoryItemGroup,
  );
  const [dynamicGroupExtensions] = useResolvedExtensions<DynamicDashboardsInventoryItemGroup>(
    isDynamicDashboardsInventoryItemGroup,
  );

  const statusGroupIcons = React.useMemo(() => {
    const mergedExtensions = [...groupExtensions, ...dynamicGroupExtensions].map(
      (e) => e.properties,
    );
    return getStatusGroupIcons(mergedExtensions);
  }, [dynamicGroupExtensions, groupExtensions]);

  if (groupID === InventoryStatusGroup.NOT_MAPPED || !count) {
    return null;
  }

  const groupIcon = statusGroupIcons[groupID] || statusGroupIcons[InventoryStatusGroup.UNKNOWN];

  return <InventoryItemStatus count={count} icon={groupIcon} />;
};

const StatusLink: React.FC<StatusLinkProps> = ({
  groupID,
  count,
  statusIDs,
  kind,
  namespace,
  filterType,
  basePath,
}) => {
  const groupExtensions = useExtensions<DashboardsInventoryItemGroup>(
    isDashboardsInventoryItemGroup,
  );

  const [dynamicGroupExtensions] = useResolvedExtensions<DynamicDashboardsInventoryItemGroup>(
    isDynamicDashboardsInventoryItemGroup,
  );

  const statusGroupIcons = React.useMemo(() => {
    const mergedExtensions = [...groupExtensions, ...dynamicGroupExtensions].map(
      (e) => e.properties,
    );
    return getStatusGroupIcons(mergedExtensions);
  }, [dynamicGroupExtensions, groupExtensions]);

  if (groupID === InventoryStatusGroup.NOT_MAPPED || !count) {
    return null;
  }

  const groupIcon = statusGroupIcons[groupID] || statusGroupIcons[InventoryStatusGroup.NOT_MAPPED];
  const statusItems = encodeURIComponent(statusIDs.join(','));
  const path = basePath || resourcePathFromModel(kind, null, namespace);
  const to =
    filterType && statusItems.length > 0 ? `${path}?rowFilter-${filterType}=${statusItems}` : path;

  return <InventoryItemStatus count={count} icon={groupIcon} linkTo={to} />;
};

const ResourceTitleComponent: React.FC<ResourceTitleComponentComponent> = ({
  kind,
  namespace,
  children,
  basePath,
  dataTest,
}) => (
  <Link to={basePath || resourcePathFromModel(kind, null, namespace)} data-test={dataTest}>
    {children}
  </Link>
);

export const ResourceInventoryItem: React.FC<ResourceInventoryItemProps> = ({
  kind,
  TitleComponent,
  title,
  titlePlural,
  resources = [],
  additionalResources,
  isLoading,
  mapper,
  namespace,
  error,
  showLink = true,
  ExpandedComponent,
  basePath,
  dataTest,
}) => {
  const { t } = useTranslation();
  let Title: React.ComponentType = React.useCallback(
    (props) => (
      <ResourceTitleComponent
        kind={kind}
        namespace={namespace}
        basePath={basePath}
        dataTest={dataTest}
        {...props}
      />
    ),
    [kind, namespace, basePath, dataTest],
  );

  if (TitleComponent) Title = TitleComponent;

  const groupExtensions = useExtensions<DashboardsInventoryItemGroup>(
    isDashboardsInventoryItemGroup,
  );
  const [dynamicGroupExtensions] = useResolvedExtensions<DynamicDashboardsInventoryItemGroup>(
    isDynamicDashboardsInventoryItemGroup,
  );

  const groups = React.useMemo(() => (mapper ? mapper(resources, additionalResources) : {}), [
    mapper,
    resources,
    additionalResources,
  ]);

  const top3Groups = React.useMemo(() => {
    const mergedExtensions = [...groupExtensions, ...dynamicGroupExtensions].map(
      (e) => e.properties,
    );
    return getTop3Groups(
      mergedExtensions,
      Object.keys(groups).filter((key) => groups[key].count > 0),
    );
  }, [dynamicGroupExtensions, groupExtensions, groups]);

  // The count can depend on additionalResources (like mixing of VM and VMI for kubevirt-plugin)
  const totalCount = React.useMemo(
    () =>
      mapper
        ? Object.keys(groups).reduce((acc, cur) => groups[cur].count + acc, 0)
        : resources.length,
    [mapper, groups, resources],
  );

  const titleLabel = title || (kind.labelKey ? t(kind.labelKey) : kind.label);
  const titlePluralLabel =
    titlePlural || (kind.labelPluralKey ? t(kind.labelPluralKey) : kind.labelPlural);

  return (
    <InventoryItem
      isLoading={isLoading}
      title={titleLabel}
      titlePlural={titlePluralLabel}
      count={totalCount}
      error={error}
      TitleComponent={showLink ? Title : null}
      ExpandedComponent={ExpandedComponent}
      dataTest={dataTest}
    >
      {top3Groups.map((key) =>
        showLink ? (
          <StatusLink
            key={key}
            kind={kind}
            namespace={namespace}
            groupID={key}
            count={groups[key].count}
            statusIDs={groups[key].statusIDs}
            filterType={groups[key].filterType}
            basePath={basePath}
          />
        ) : (
          <Status key={key} groupID={key} count={groups[key].count} />
        ),
      )}
    </InventoryItem>
  );
};

export default InventoryItem;

type StatusGroup = {
  [key in InventoryStatusGroup | string]: {
    filterType?: string;
    statusIDs: string[];
    count: number;
  };
};

export type StatusGroupMapper<
  T extends K8sResourceCommon = K8sResourceCommon,
  R extends { [key: string]: K8sResourceCommon[] } = { [key: string]: K8sResourceCommon[] }
> = (resources: T[], additionalResources?: R) => StatusGroup;

type InventoryItemProps = {
  isLoading: boolean;
  title: string;
  titlePlural?: string;
  count: number;
  children?: React.ReactNode;
  error?: boolean;
  TitleComponent?: React.ComponentType<{}>;
  ExpandedComponent?: React.ComponentType<{}>;
  dataTest?: string;
};

type StatusProps = {
  groupID: InventoryStatusGroup | string;
  count: number;
};

type StatusLinkProps = StatusProps & {
  statusIDs: string[];
  kind: K8sKind;
  namespace?: string;
  filterType?: string;
  basePath?: string;
};

export type ExpandedComponentProps = {
  resource: K8sResourceKind[];
  additionalResources?: { [key: string]: K8sResourceKind[] };
};

type ResourceTitleComponentComponent = {
  kind: K8sKind;
  namespace: string;
  basePath?: string;
  dataTest?: string;
};
