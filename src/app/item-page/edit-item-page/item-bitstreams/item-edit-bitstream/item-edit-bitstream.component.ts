import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { Bitstream } from '../../../../core/shared/bitstream.model';
import cloneDeep from 'lodash/cloneDeep';
import { ObjectUpdatesService } from '../../../../core/data/object-updates/object-updates.service';
import { map, Observable } from 'rxjs';
import { BitstreamFormat } from '../../../../core/shared/bitstream-format.model';
import { getRemoteDataPayload, getFirstSucceededRemoteData } from '../../../../core/shared/operators';
import { ResponsiveTableSizes } from '../../../../shared/responsive-table-sizes/responsive-table-sizes';
import { DSONameService } from '../../../../core/breadcrumbs/dso-name.service';
import { FieldUpdate } from '../../../../core/data/object-updates/field-update.model';
import { FieldChangeType } from '../../../../core/data/object-updates/field-change-type.model';
import { getBitstreamDownloadRoute } from '../../../../app-routing-paths';
import { Permission } from 'src/app/core/shared/permission.model';
import { HttpClient } from '@angular/common/http';
import { HALEndpointService } from 'src/app/core/shared/hal-endpoint.service';
import { format }  from 'date-fns-tz';

@Component({
  selector: 'ds-item-edit-bitstream',
  styleUrls: ['../item-bitstreams.component.scss'],
  templateUrl: './item-edit-bitstream.component.html',
})
/**
 * Component that displays a single bitstream of an item on the edit page
 * Creates an embedded view of the contents
 * (which means it'll be added to the parents html without a wrapping ds-item-edit-bitstream element)
 */
export class ItemEditBitstreamComponent implements OnChanges, OnInit {

  /**
   * The view on the bitstream
   */
  @ViewChild('bitstreamView', {static: true}) bitstreamView;

  /**
   * The current field, value and state of the bitstream
   */
  @Input() fieldUpdate: FieldUpdate;

  /**
   * The url of the bundle
   */
  @Input() bundleUrl: string;

  /**
   * The bootstrap sizes used for the columns within this table
   */
  @Input() columnSizes: ResponsiveTableSizes;

  @Input() readOnly: boolean;

  /**
   * The bitstream of this field
   */
  bitstream: Bitstream;

  /**
   * The bitstream's name
   */
  bitstreamName: string;

  /**
   * The bitstream's download url
   */
  bitstreamDownloadUrl: string;

  /**
   * The format of the bitstream
   */
  format$: Observable<BitstreamFormat>;
  permission$: Observable<string>;

  constructor(private objectUpdatesService: ObjectUpdatesService,
              private dsoNameService: DSONameService,
              private httpClient: HttpClient,
              private halService: HALEndpointService,
              private viewContainerRef: ViewContainerRef) {
  }

  ngOnInit(): void {
    this.viewContainerRef.createEmbeddedView(this.bitstreamView);
  }

  /**
   * Update the current bitstream and its format on changes
   * @param changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    this.bitstream = cloneDeep(this.fieldUpdate.field) as Bitstream;
    this.bitstreamName = this.dsoNameService.getName(this.bitstream);
    this.bitstreamDownloadUrl = getBitstreamDownloadRoute(this.bitstream);
    this.format$ = this.bitstream.format.pipe(
      getFirstSucceededRemoteData(),
      getRemoteDataPayload()
    );
    this.permission$ = this.getBitstreamPermission(this.bitstream.id).pipe(map((p) => p.permission + this.formatEmabargoEndDate(p)));
  }

  getBitstreamPermission(bitstreamID: string): Observable<Permission> {
    return this.httpClient.get<Permission>(this.halService.getRootHref() + '/kul/permissions/' + bitstreamID);
  }

  formatEmabargoEndDate(permission: Permission): string {
    if (permission.embargoEndDate === null || permission.embargoEndDate.year == null) {
      return '';
    }
    const date = new Date(permission.embargoEndDate.year, permission.embargoEndDate.month - 1, permission.embargoEndDate.day);
    return ' ' + format(date, 'yyyy-MM-dd');
  }

  /**
   * Sends a new remove update for this field to the object updates service
   */
  remove(): void {
    this.objectUpdatesService.saveRemoveFieldUpdate(this.bundleUrl, this.bitstream);
  }

  /**
   * Cancels the current update for this field in the object updates service
   */
  undo(): void {
    this.objectUpdatesService.removeSingleFieldUpdate(this.bundleUrl, this.bitstream.uuid);
  }

  /**
   * Check if a user should be allowed to remove this field
   */
  canRemove(): boolean {
    return this.fieldUpdate.changeType !== FieldChangeType.REMOVE;
  }

  /**
   * Check if a user should be allowed to cancel the update to this field
   */
  canUndo(): boolean {
    return this.fieldUpdate.changeType >= 0;
  }

}
