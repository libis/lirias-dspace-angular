import { AuthorizationDataService } from '../authorization-data.service';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { catchError, map, Observable, switchMap} from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { getFirstSucceededRemoteData, getRemoteDataPayload } from 'src/app/core/shared/operators';
import { returnForbiddenUrlTreeOrLoginOnAllFalse } from 'src/app/core/shared/authorized.operators';

export class LocalAdminGuard implements CanActivate {
  constructor(protected authorizationService: AuthorizationDataService, protected router: Router, protected authService: AuthService) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.getAuthenticatedUserFromStore()
      .pipe(switchMap((user) => user.groups))
      .pipe(getFirstSucceededRemoteData(), getRemoteDataPayload())
      .pipe(
        map((groups) => groups.page.map((g) => g.id === 'Admins_local')),
        catchError(_ => [false]),
        returnForbiddenUrlTreeOrLoginOnAllFalse(this.router, this.authService, state.url)
      );
  }
}
