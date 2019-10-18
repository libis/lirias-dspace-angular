import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FieldUpdate } from '../../../../core/data/object-updates/object-updates.reducer';
import { Bitstream } from '../../../../core/shared/bitstream.model';
import { cloneDeep } from 'lodash';
import { ObjectUpdatesService } from '../../../../core/data/object-updates/object-updates.service';
import { FieldChangeType } from '../../../../core/data/object-updates/object-updates.actions';
import { Observable } from 'rxjs/internal/Observable';
import { BitstreamFormat } from '../../../../core/shared/bitstream-format.model';
import { getRemoteDataPayload, getSucceededRemoteData } from '../../../../core/shared/operators';

@Component({
  // tslint:disable-next-line:component-selector
  selector: '[ds-item-edit-bitstream]',
  templateUrl: './item-edit-bitstream.component.html',
})
/**
 * Component that displays a single bitstream of an item on the edit page
 */
export class ItemEditBitstreamComponent implements OnChanges {
  /**
   * The current field, value and state of the bitstream
   */
  @Input() fieldUpdate: FieldUpdate;

  /**
   * The current url of this page
   */
  @Input() url: string;

  /**
   * The url of the bundle
   */
  @Input() bundleUrl: string;

  /**
   * The bitstream of this field
   */
  bitstream: Bitstream;

  /**
   * The format of the bitstream
   */
  format$: Observable<BitstreamFormat>;

  constructor(private objectUpdatesService: ObjectUpdatesService) {
  }

  /**
   * Update the current bitstream and its format on changes
   * @param changes
   */
  ngOnChanges(changes: SimpleChanges): void {
    this.bitstream = cloneDeep(this.fieldUpdate.field) as Bitstream;
    this.format$ = this.bitstream.format.pipe(
      getSucceededRemoteData(),
      getRemoteDataPayload()
    );
  }

  /**
   * Sends a new remove update for this field to the object updates service
   */
  remove(): void {
    this.objectUpdatesService.saveRemoveFieldUpdate(this.url, this.bitstream);
    this.objectUpdatesService.saveRemoveFieldUpdate(this.bundleUrl, this.bitstream);
  }

  /**
   * Cancels the current update for this field in the object updates service
   */
  undo(): void {
    this.objectUpdatesService.removeSingleFieldUpdate(this.url, this.bitstream.uuid);
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
